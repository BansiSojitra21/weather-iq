import { Button } from "@/components/ui";
import { Skeleton } from "@/components/ui";
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
    return (
      <div role="status" aria-live="polite" className="grid gap-3">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
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

export function WeatherLoader({ location = "Mumbai" }: { location?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading weather for ${location}`}
      className="grid min-h-[65vh] place-items-center py-12"
    >
      <div className="flex flex-col items-center text-center">
        <div className="weather-loader-mark relative grid h-24 w-24 place-items-center rounded-[2rem] bg-gradient-to-br from-blue-500 to-sky-400 text-white shadow-xl shadow-blue-500/25">
          <span className="weather-loader-orbit absolute inset-[-10px] rounded-[2.4rem] border border-blue-400/40" aria-hidden />
          <span className="weather-loader-orbit weather-loader-orbit-delayed absolute inset-[-19px] rounded-[2.8rem] border border-sky-300/30" aria-hidden />
          <CloudSun className="weather-loader-icon h-12 w-12" strokeWidth={1.6} aria-hidden />
          <span className="weather-loader-spark absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-200" aria-hidden />
        </div>
        <p className="mt-8 text-lg font-semibold tracking-tight text-foreground">WeatherIQ</p>
        <p className="mt-1 text-sm text-muted-foreground">Loading {location} weather…</p>
        <span className="sr-only">Please wait while current conditions and the forecast load.</span>
      </div>
    </div>
  );
}
