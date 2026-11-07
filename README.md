# WeatherIQ

        WeatherIQ is a weather monitoring and analytics application. It combines observed and forecast weather data with forecasting, anomaly detection, risk indicators, and configurable threshold alerts.

## Features

- Ingests current, hourly, daily, and forecast data from Open-Meteo.
- Stores weather observations, forecasts, and alerts in SQLite or PostgreSQL.
- Provides a dashboard for weather conditions, analytics, forecasts, and regional risk.
- Supports threshold rules scoped to a selected city or all configured cities.
- Evaluates enabled rules and provides alert history and optional browser notifications.
- Includes model training, forecast evaluation, and anomaly detection workflows.

WeatherIQ analytics and alerts are informational and are not official weather warnings.

## Architecture

| Component | Path | Description |
|---|---|---|
| Web application | `frontend` | Next.js dashboard and API proxy |
| API | `services/api` | FastAPI endpoints and weather services |
| Machine learning | `ml` | Model training and anomaly detection |
| Scripts | `scripts` | Bootstrap, ingestion, and training workflows |
| Data | `data` | Local database and weather cache |
| Infrastructure | `infra` | Container and deployment configuration |

## Requirements

- Python 3.11 or later
- Node.js and npm
- Open-Meteo access for weather data ingestion

## Local development

Install backend and frontend dependencies from the repository root:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Set-Location frontend
npm install
Set-Location ..
```

Configure the frontend proxy to reach the local API. The API key must match the backend key:

```powershell
$env:WEATHERIQ_API_KEY = "dev-weatheriq-key"
$env:API_INTERNAL_BASE_URL = "http://127.0.0.1:8000/api/v1"
```

Start the API and frontend:

```powershell
.\start.ps1
```

The dashboard is available at `http://localhost:3000`; the API is available at `http://127.0.0.1:8000`. The API creates the local SQLite database at `data/weatheriq.db` by default.

To load initial weather data, run:

```powershell
.\.venv\Scripts\python.exe scripts\bootstrap.py
```

## Configuration

Backend settings use the `WEATHERIQ_` environment variable prefix. Common settings include:

| Variable | Purpose |
|---|---|
| `WEATHERIQ_API_KEY` | API key required for write operations |
| `WEATHERIQ_DATABASE_URL` | Database connection URL; defaults to local SQLite |
| `WEATHERIQ_ALERT_SCHEDULE_ENABLED` | Enables periodic alert evaluation |
| `WEATHERIQ_ANOMALY_SCHEDULE_ENABLED` | Enables scheduled anomaly detection |

The Next.js server uses `API_INTERNAL_BASE_URL` for the FastAPI base URL, including `/api/v1`, and `WEATHERIQ_API_KEY` to authenticate write requests. For deployment, use a persistent database and configure matching API keys in the API and frontend environments. Do not use the local development key in production.

## Weather refresh behavior

The selected city is saved in each browser's local storage, so different browsers can show different cities on the same deployment. The dashboard checks its selected city's current weather every 30 minutes while open, and the API refreshes a snapshot when it is older than `WEATHERIQ_CACHE_TTL_MINUTES` (30 minutes by default).

The GitHub Actions workflow at `.github/workflows/daily-weather-refresh.yml` requests a current-weather and forecast refresh for all configured locations every day at 06:00 India time (00:30 UTC). To enable it:

1. Push the workflow to the repository's default branch.
2. In GitHub, open **Settings → Secrets and variables → Actions → Variables**, then create `WEATHER_API_BASE_URL` with the public API service URL ending in `/api/v1` (not the website URL).
3. In **Settings → Secrets and variables → Actions → Secrets**, create `WEATHERIQ_API_KEY` with the same API key configured on the backend.
4. Ensure the API is publicly reachable and uses persistent storage.
5. In **Actions → Daily Weather Refresh**, select **Run workflow** to test it. Future runs are automatic.

GitHub-hosted standard runners are free for public repositories. Private repositories use the included monthly Actions allowance and may incur charges if it is exceeded. Scheduled workflows run from the default branch and can be delayed during high GitHub Actions load. This scheduler wakes the deployed API only at its scheduled time; it does not require the website to be open or your computer to be on.

## Validation

Run backend tests from the repository root:

```powershell
python -m pytest
```

Run frontend checks from `frontend`:

```powershell
npm test
npm run lint
npm run build
```
