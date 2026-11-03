# WeatherIQ

WeatherIQ is a local weather-intelligence dashboard that combines weather observations, forecast data, anomaly detection, and alert rule evaluation in one project.

The application ingests Open-Meteo data, stores it locally, trains lightweight forecasting and anomaly models, and exposes that information through a dashboard and API.

The project includes a Next.js frontend, a FastAPI backend, model training scripts, and a small data-processing workflow for weather alerts and monitoring.

## Project structure

- `frontend` — Next.js frontend for the weather dashboard and intelligence views
- `services/api` — FastAPI application and API endpoints
- `ml` — feature engineering, model training, and anomaly detection logic
- `scripts` — data refresh and bootstrap workflows
- `data` — local SQLite database and cached weather data
- `infra` — Docker and compose configuration

## Main features

- Daily and hourly weather ingestion from Open-Meteo
- Local SQLite-backed storage for observations, forecasts, alerts, and monitoring data
- Forecast comparison and model evaluation views
- Anomaly detection based on recent history and robustness checks
- Alert rule creation and evaluation for weather thresholds
- Recent alert history and notification preferences in the frontend

## Data sources

Weather data is sourced from Open-Meteo. The project treats model outputs and derived analytics as informational outputs, not official weather warnings.

## Deploying alerts

The frontend needs `API_INTERNAL_BASE_URL` set to the deployed FastAPI base URL, including `/api/v1`, and `WEATHERIQ_API_KEY` set to the same API key configured on that backend. Configure both as Vercel environment variables and redeploy; a localhost API URL only works when the backend runs on the same machine.

The API must use a persistent database and keep alert evaluation enabled. Browser notifications also require the user to enable them from the bell menu and grant browser permission. They are delivered while the WeatherIQ page is open; this app does not currently use push notifications for a closed browser.

## Repository purpose

This repository is a weather intelligence and analytics project for local experimentation and monitoring, with a focus on forecast quality, anomaly detection, and rule-based alert evaluation.
