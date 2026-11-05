import { Button } from "@/components/ui";
import { CloudSun } from "lucide-react";

export function StatePanel({
  status,
  message,
  onRetry,
}: {
  status: "loading" | "error" | "empty";
  message?: string;
  onRetry?: () => void;
}) {
  if (status === "loading") {
    return <WeatherLoader message="Loading your page…" />;
  }
  return (
    <div role="status" className="rounded-xl border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">{message}</p>
      {status === "error" && onRetry ? (
        <Button className="mt-4" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function WeatherLoader({
  location = "Mumbai",
  message,
}: {
  location?: string;
  message?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message ?? `Loading weather for ${location}`}
      className="fixed inset-0 z-[60] grid min-h-screen place-items-center bg-background px-4"
    >
      <div className="flex flex-col items-center text-center">
        <div className="weather-loader-mark relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-sky-400 text-white shadow-lg shadow-blue-500/25">
          <span className="weather-loader-orbit absolute inset-[-6px] rounded-[1.35rem] border border-blue-400/40" aria-hidden />
          <span className="weather-loader-orbit weather-loader-orbit-delayed absolute inset-[-11px] rounded-[1.6rem] border border-sky-300/30" aria-hidden />
          <CloudSun className="weather-loader-icon h-8 w-8" strokeWidth={1.6} aria-hidden />
          <span className="weather-loader-spark absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-200" aria-hidden />
        </div>
        <p className="mt-6 text-base font-semibold tracking-tight text-foreground">WeatherIQ</p>
        <p className="mt-1 text-sm text-muted-foreground">{message ?? `Loading ${location} weather…`}</p>
        <span className="sr-only">Please wait while current conditions and the forecast load.</span>
      </div>
    </div>
  );
}
