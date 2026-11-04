export function formatWhen(value: string | null | undefined, timeZone: string) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function dateKeyInTimeZone(value: string | null | undefined, timeZone: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  return year && month && day ? `${year}-${month}-${day}` : null;
}

export function daylightDetails(
  sunrise: string | null | undefined,
  sunset: string | null | undefined,
  timeZone: string,
) {
  if (!sunrise || !sunset) return null;
  const sunriseDate = new Date(sunrise);
  const sunsetDate = new Date(sunset);
  if (Number.isNaN(sunriseDate.getTime()) || Number.isNaN(sunsetDate.getTime())) return null;
  const durationMinutes = Math.round((sunsetDate.getTime() - sunriseDate.getTime()) / 60_000);
  if (durationMinutes <= 0) return null;

  const timeOfDayPercent = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
    return ((part("hour") * 60 + part("minute")) / 1440) * 100;
  };
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return {
    duration: `${hours}h ${minutes}m`,
    solarNoon: new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date((sunriseDate.getTime() + sunsetDate.getTime()) / 2)),
    sunrisePercent: timeOfDayPercent(sunriseDate),
    sunsetPercent: timeOfDayPercent(sunsetDate),
  };
}

export function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function defaultRange(days = 180) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return { start: isoDate(start), end: isoDate(end) };
}
