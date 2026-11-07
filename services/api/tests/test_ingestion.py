from datetime import datetime, timedelta, timezone

import httpx
import pytest

from app.core.config import Settings
from app.db.models import WeatherObservation
from app.services.ingestion import upsert_observations
from app.services.open_meteo import fetch_json, parse_daily_archive


def test_parse_daily_archive_cleans_rows():
    payload = {
        "daily": {
            "time": ["2024-01-01", "2024-01-02"],
            "temperature_2m_mean": [10.5, 999],
            "temperature_2m_min": [4, 5],
            "temperature_2m_max": [14, 16],
            "precipitation_sum": [0, 3.2],
            "relative_humidity_2m_mean": [55, None],
            "wind_speed_10m_max": [12, 14],
            "pressure_msl_mean": [1012, 1010],
            "cloud_cover_mean": [20, 80],
            "weather_code": [1, 61],
        }
    }
    rows = parse_daily_archive(payload)
    assert len(rows) == 2
    assert rows[0]["temperature_c"] == 10.5
    assert rows[1]["temperature_c"] is None
    assert rows[1]["precipitation_mm"] == 3.2


def test_fetch_json_honors_retry_after_for_rate_limited_provider(monkeypatch):
    url = "https://example.test/forecast"
    responses = iter(
        [
            httpx.Response(429, headers={"Retry-After": "7"}, request=httpx.Request("GET", url)),
            httpx.Response(200, json={"current": {}}, request=httpx.Request("GET", url)),
        ]
    )
    delays = []

    class Client:
        def get(self, _url, **_kwargs):
            return next(responses)

    monkeypatch.setattr("app.services.open_meteo._read_cache", lambda *_args: None)
    monkeypatch.setattr("app.services.open_meteo._write_cache", lambda *_args: None)
    monkeypatch.setattr("app.services.open_meteo.time.sleep", delays.append)

    assert fetch_json(url, ttl=timedelta(minutes=30), client=Client()) == {"current": {}}
    assert delays == [7.0]


def test_fetch_json_uses_exponential_backoff_after_rate_limit(monkeypatch):
    url = "https://example.test/forecast"
    responses = iter(
        httpx.Response(429, request=httpx.Request("GET", url))
        for _ in range(4)
    )
    delays = []

    class Client:
        def get(self, _url, **_kwargs):
            return next(responses)

    monkeypatch.setattr("app.services.open_meteo._read_cache", lambda *_args: None)
    monkeypatch.setattr("app.services.open_meteo.time.sleep", delays.append)

    with pytest.raises(RuntimeError, match="HTTP 429"):
        fetch_json(url, ttl=timedelta(minutes=30), client=Client())
    assert delays == [10.0, 20.0, 40.0]


def test_fetch_json_sends_proxy_key_only_to_configured_forecast_proxy(monkeypatch):
    settings = Settings(
        forecast_url="https://weather-proxy.example.workers.dev/v1/forecast",
        forecast_proxy_key="test-proxy-key",
    )
    monkeypatch.setattr("app.services.open_meteo.get_settings", lambda: settings)
    monkeypatch.setattr("app.services.open_meteo._read_cache", lambda *_args: None)
    monkeypatch.setattr("app.services.open_meteo._write_cache", lambda *_args: None)
    requests = []

    class Client:
        def get(self, url, **kwargs):
            requests.append((url, kwargs.get("headers")))
            return httpx.Response(200, json={"current": {}}, request=httpx.Request("GET", url))

    forecast = "https://weather-proxy.example.workers.dev/v1/forecast?latitude=1"
    archive = "https://archive-api.open-meteo.com/v1/archive?latitude=1"

    fetch_json(forecast, ttl=timedelta(minutes=30), client=Client())
    fetch_json(archive, ttl=timedelta(minutes=30), client=Client())

    assert requests == [
        (forecast, {"X-WeatherIQ-Proxy-Key": "test-proxy-key"}),
        (archive, {}),
    ]


def test_observation_upsert_is_idempotent(database):
    location_id = 1
    from app.db.models import Location

    database.add(Location(id=location_id, name="Test City", country="Test", latitude=1, longitude=2, timezone="UTC"))
    database.flush()
    retrieved = datetime(2024, 1, 3, tzinfo=timezone.utc)
    rows = [
        {
            "observed_at": datetime(2024, 1, 1, tzinfo=timezone.utc),
            "temperature_c": 10,
            "precipitation_mm": 0,
        }
    ]
    assert upsert_observations(database, location_id, "daily", rows, retrieved) == 1
    rows[0]["temperature_c"] = 11
    assert upsert_observations(database, location_id, "daily", rows, retrieved) == 1
    database.commit()
    stored = database.query(WeatherObservation).all()
    assert len(stored) == 1
    assert stored[0].temperature_c == 11
