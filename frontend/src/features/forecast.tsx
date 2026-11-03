"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, CloudSun, Droplets, Gauge, ThermometerSun } from "lucide-react";
import { LineSeriesChart, chartColors } from "@/components/charts";
import { useDashboard } from "@/components/dashboard-context";
import { StatePanel } from "@/components/states";
import { Badge, Card } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateKeyInTimeZone, formatNumber, formatWhen } from "@/lib/format";

type TemperatureResponse = {
  model: { name: string; version: string; algorithm: string };
  predictions: {
    horizon_days: number;
    issued_at: string;
    target_time: string;
    predicted_temperature: number;
    lower: number | null;
    upper: number | null;
    persistence_baseline: number | null;
    statistical_baseline: number | null;
    interval: { test_coverage: number; note: string } | null;
    external_forecast: null | { temperature_min: number | null; temperature_max: number | null; note: string };
  }[];
  backtest: {
    label: string;
    by_horizon: {
      horizon_days: number;
      test: { mae: number; rmse: number; n: number };
      persistence_test: { mae: number };
      fourier_test: { mae: number };
      skill_vs_persistence: number | null;
    }[] | null;
  };
  external_benchmark: {
    available: boolean;
    note: string;
    by_lead_days: { lead_days: number; available: boolean; n?: number; temperature_mae_c?: number }[];
  };
  limitations: string | null;
  comparison_note: string;
  unit_labels: { temperature: string; precipitation: string };
};

const HORIZONS = [1, 2, 3, 7] as const;

type DailyWeatherResponse = {
  daily: {
    valid_at: string;
    precipitation_probability: number | null;
    precipitation: number | null;
  }[];
};

type WeatherHistoryResponse = {
  series: {
    observed_at: string;
    temperature: number | null;
    temperature_min: number | null;
    temperature_max: number | null;
    precipitation: number | null;
  }[];
  unit_labels: { temperature: string; precipitation: string };
};

function shiftDate(date: string, days: number) {
  const shifted = new Date(`${date}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof ThermometerSun;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-accent" aria-hidden />
        <span>{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </Card>
  );
}

export function ForecastPage() {
  const { locationId, units, timeZone } = useDashboard();
  const [horizon, setHorizon] = useState<number>(1);
  const today = dateKeyInTimeZone(new Date().toISOString(), timeZone) ?? new Date().toISOString().slice(0, 10);
  const historyEnd = shiftDate(today, -1);
  const historyStart = shiftDate(historyEnd, -6);
  const tempCacheKey = `weatheriq.cache.predict-temperature.${locationId}.${units}`;
  const temperature = useQuery({
    queryKey: ["predict-temperature", locationId, units],
    enabled: locationId != null,
    queryFn: async () => {
      const res = await api<TemperatureResponse>("predictions/temperature", {
        method: "POST",
        body: JSON.stringify({ location_id: locationId, horizons: [...HORIZONS], units }),
      });
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(tempCacheKey, JSON.stringify(res));
        }
      } catch {}
      return res;
    },
    initialData: () => {
      if (typeof window === "undefined" || !locationId) return undefined;
      try {
        const stored = window.localStorage.getItem(tempCacheKey);
        if (stored) return JSON.parse(stored) as TemperatureResponse;
      } catch {}
      return undefined;
    },
  });
  const weather = useQuery({
    queryKey: ["current", locationId, units],
    enabled: locationId != null,
    queryFn: () => api<DailyWeatherResponse>(`weather/current?location_id=${locationId}&units=${units}`),
  });
  const recentObservations = useQuery({
    queryKey: ["observed-weather-history", locationId, units, historyStart, historyEnd],
    enabled: locationId != null,
    queryFn: () =>
      api<WeatherHistoryResponse>(
        `weather/history?location_id=${locationId}&start=${historyStart}&end=${historyEnd}&granularity=daily&units=${units}`,
      ),
  });
  if (locationId == null || temperature.isLoading) return <StatePanel status="loading" />;
  if (temperature.isError) {
    return (
      <StatePanel
        status="error"
        message={temperature.error instanceof ApiError ? temperature.error.message : "Forecast unavailable."}
        onRetry={() => temperature.refetch()}
      />
    );
  }

  const data = temperature.data;
  const selected = data?.predictions.find((item) => item.horizon_days === horizon) ?? data?.predictions[0];
  const holdout = data?.backtest.by_horizon?.find((item) => item.horizon_days === selected?.horizon_days);
  const targetDay = dateKeyInTimeZone(selected?.target_time, timeZone);
  const dailyOutlook = targetDay
    ? weather.data?.daily.find((item) => dateKeyInTimeZone(item.valid_at, timeZone) === targetDay)
    : undefined;
  const unit = data?.unit_labels.temperature ?? "°C";
  const change = selected?.persistence_baseline == null
    ? null
    : selected.predicted_temperature - selected.persistence_baseline;
  const ChangeIcon = change != null && change < 0 ? ArrowDown : ArrowUp;
  const direction = change == null ? "Yesterday comparison unavailable" : Math.abs(change) < 0.05
    ? "Close to the previous day's average"
    : `${formatNumber(Math.abs(change))} ${unit} ${change > 0 ? "warmer" : "cooler"} than the previous day's average`;
  const observations = recentObservations.data?.series ?? [];
  const temperatures = observations.flatMap((row) => row.temperature == null ? [] : [row.temperature]);
  const rainfall = observations.flatMap((row) => row.precipitation == null ? [] : [row.precipitation]);
  const meanTemperature = temperatures.length
    ? temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length
    : null;
  const totalRainfall = rainfall.length
    ? rainfall.reduce((sum, value) => sum + value, 0)
    : null;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Badge tone="accent">Forecast outlook</Badge>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">See what the next days may bring</h1>
          <p className="mt-1 text-sm text-muted-foreground">Explore the model estimate, daily outlook, and the evidence behind each lead time.</p>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <p className="px-1 text-xs text-muted-foreground lg:text-right">
            Target: <span className="font-medium text-foreground">{selected ? formatWhen(selected.target_time, timeZone) : "Unavailable"}</span>
          </p>
          <div className="flex max-w-full flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-muted/60 p-1" role="group" aria-label="Forecast horizon">
            <span className="pl-3 pr-1 text-xs font-medium text-muted-foreground">Look ahead</span>
            {HORIZONS.map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={horizon === days}
                onClick={() => setHorizon(days)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  horizon === days
                    ? "bg-accent text-white shadow-sm"
                    : "text-foreground/75 hover:bg-white hover:text-foreground"
                }`}
              >
                {days} day{days === 1 ? "" : "s"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {selected ? (
        <>
          <Card className="overflow-hidden bg-white">
            <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">WeatherIQ model estimate</Badge>
                  <span className="text-xs text-muted-foreground">{horizon}-day outlook</span>
                </div>
                <p className="mt-6 text-sm text-muted-foreground">Expected daily mean temperature</p>
                <p className="mt-1 text-6xl font-semibold tracking-tight sm:text-7xl">
                  {formatNumber(selected.predicted_temperature)}<span className="ml-2 text-3xl text-muted-foreground">{unit}</span>
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <ChangeIcon className="h-4 w-4" aria-hidden />
                    {direction}
                  </span>
                  <span className="text-muted-foreground">Issued {formatWhen(selected.issued_at, timeZone)}</span>
                </div>
                <p className="mt-5 max-w-xl text-xs leading-relaxed text-muted-foreground">{data?.limitations}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-border bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ThermometerSun className="h-4 w-4" aria-hidden />
                    Model range
                  </div>
                  <p className="mt-2 text-2xl font-semibold">
                    {formatNumber(selected.lower)} <span className="text-muted-foreground">to</span> {formatNumber(selected.upper)} {unit}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected.interval
                      ? `Covered actual temperatures on ${(selected.interval.test_coverage * 100).toFixed(0)}% of past test days.`
                      : "Historical range check unavailable."}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CloudSun className="h-4 w-4" aria-hidden />
                    Daily range
                  </div>
                  {selected.external_forecast ? (
                    <>
                      <p className="mt-2 text-2xl font-semibold">
                        {formatNumber(selected.external_forecast.temperature_min)} <span className="text-muted-foreground">to</span> {formatNumber(selected.external_forecast.temperature_max)} {unit}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Low to high</p>
                    </>
                  ) : <p className="mt-2 text-sm text-muted-foreground">No daily outlook is stored for this date.</p>}
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Droplets}
              label="Rain probability"
              value={dailyOutlook?.precipitation_probability == null ? "—" : `${dailyOutlook.precipitation_probability.toFixed(0)}%`}
              detail={dailyOutlook
                ? dailyOutlook.precipitation == null
                  ? "Daily outlook · amount unavailable"
                  : `Daily outlook · ${formatNumber(dailyOutlook.precipitation)} ${data?.unit_labels.precipitation} expected`
                : weather.isError
                  ? "Rain outlook unavailable"
                  : weather.isLoading
                    ? "Loading rain outlook"
                    : weather.data?.daily.length
                      ? "No rain estimate for this date"
                      : "Rain outlook is being refreshed or is unavailable"}
            />
            <MetricCard
              icon={Gauge}
              label="Past mean error"
              value={holdout ? `${holdout.test.mae.toFixed(2)} °C` : "—"}
              detail={holdout ? `MAE on ${holdout.test.n} held-out days · lower is better` : "No matching backtest"}
            />
            <MetricCard
              icon={ThermometerSun}
              label="Past error spread"
              value={holdout ? `${holdout.test.rmse.toFixed(2)} °C` : "—"}
              detail="RMSE on the chronological holdout"
            />
            <MetricCard
              icon={change != null && change < 0 ? ArrowDown : ArrowUp}
              label="Versus yesterday"
              value={change == null ? "—" : `${change > 0 ? "+" : ""}${formatNumber(change)} ${unit}`}
              detail="Difference from the persistence baseline"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">How reliable has this lead been?</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{data?.backtest.label} Errors are in °C; lower is better.</p>
                </div>
                <Badge tone={holdout?.skill_vs_persistence != null && holdout.skill_vs_persistence > 0 ? "ok" : "amber"}>
                  {holdout?.skill_vs_persistence == null
                    ? "Baseline comparison unavailable"
                    : holdout.skill_vs_persistence > 0
                      ? `${(holdout.skill_vs_persistence * 100).toFixed(2)}% less error than yesterday`
                      : holdout.skill_vs_persistence < 0
                        ? `${(Math.abs(holdout.skill_vs_persistence) * 100).toFixed(2)}% more error than yesterday`
                        : "Same error as yesterday"}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(data?.backtest.by_horizon ?? []).map((row) => (
                  <button
                    key={row.horizon_days}
                    type="button"
                    onClick={() => setHorizon(row.horizon_days)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      row.horizon_days === selected.horizon_days
                        ? "border-accent bg-accent/5"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <span className="block text-xs text-muted-foreground">{row.horizon_days} day{row.horizon_days === 1 ? "" : "s"}</span>
                    <span className="mt-1 block text-lg font-semibold">{row.test.mae.toFixed(2)}°</span>
                    <span className="text-xs text-muted-foreground">MAE · {row.test.n} days</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">A positive skill means lower average error than repeating yesterday; a negative skill means higher error. Past performance does not guarantee future results.</p>
            </Card>

            <Card className="min-w-0 overflow-hidden p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">Recent observed weather</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Actual daily measurements · {historyStart} to {historyEnd}</p>
                </div>
                <Badge tone="ok">Observed</Badge>
              </div>
              {recentObservations.isLoading ? (
                <p className="mt-5 text-sm text-muted-foreground">Loading archived observations…</p>
              ) : recentObservations.isError ? (
                <div className="mt-5 rounded-xl border border-danger/20 bg-danger/5 p-3">
                  <p className="text-sm text-danger">
                    {recentObservations.error instanceof ApiError
                      ? recentObservations.error.message
                      : "Observed weather could not be loaded."}
                  </p>
                  <button type="button" className="mt-2 text-xs font-medium text-accent underline" onClick={() => recentObservations.refetch()}>
                    Try again
                  </button>
                </div>
              ) : observations.length ? (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-muted/60 p-3">
                      <p className="text-xs text-muted-foreground">Observed mean</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatNumber(meanTemperature)} <span className="text-xs font-normal text-muted-foreground">{recentObservations.data?.unit_labels.temperature ?? unit}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{temperatures.length} observed day{temperatures.length === 1 ? "" : "s"}</p>
                    </div>
                    <div className="rounded-xl bg-muted/60 p-3">
                      <p className="text-xs text-muted-foreground">Observed rainfall</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatNumber(totalRainfall)} <span className="text-xs font-normal text-muted-foreground">{recentObservations.data?.unit_labels.precipitation}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{rainfall.length} measured day{rainfall.length === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <LineSeriesChart
                      label="Observed daily mean, low, and high temperatures"
                      data={observations.map((row) => ({
                        label: new Intl.DateTimeFormat("en-GB", { timeZone, day: "2-digit", month: "short" }).format(new Date(row.observed_at)),
                        mean: row.temperature,
                        low: row.temperature_min,
                        high: row.temperature_max,
                      }))}
                      lines={[
                        { key: "mean", name: "Mean", color: chartColors.primary },
                        { key: "high", name: "High", color: chartColors.tertiary },
                        { key: "low", name: "Low", color: chartColors.secondary },
                      ]}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Daily observed temperatures in {recentObservations.data?.unit_labels.temperature ?? unit}. Values are from the weather archive, not forecast estimates.</p>
                </>
              ) : (
                <p className="mt-5 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
                  No archived daily observations are available for this period yet.
                </p>
              )}
            </Card>
          </div>

        </>
      ) : <StatePanel status="empty" message="The model did not return a prediction for this lead time." />}
    </div>
  );
}
