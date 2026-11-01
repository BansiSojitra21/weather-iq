"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { Location } from "@/lib/types";

type DashboardValue = {
  locations: Location[];
  locationId: number | null;
  setLocationId: (id: number) => void;
  location?: Location;
  units: "metric" | "imperial";
  setUnits: (units: "metric" | "imperial") => void;
  timeZone: string;
};

const DashboardContext = createContext<DashboardValue | null>(null);
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function storedLocation() {
  return window.localStorage.getItem("weatheriq.location");
}

function storedUnits() {
  const value = window.localStorage.getItem("weatheriq.units");
  return value === "imperial" ? "imperial" : "metric";
}

const FALLBACK_LOCATIONS: Location[] = [
  { id: 1, name: "Ahmedabad", country: "India", latitude: 23.0225, longitude: 72.5714, timezone: "Asia/Kolkata", elevation_m: 53.0, is_default: false },
  { id: 2, name: "Bengaluru", country: "India", latitude: 12.9716, longitude: 77.5946, timezone: "Asia/Kolkata", elevation_m: 910.0, is_default: false },
  { id: 3, name: "Bhopal", country: "India", latitude: 23.2599, longitude: 77.4126, timezone: "Asia/Kolkata", elevation_m: 495.0, is_default: false },
  { id: 4, name: "Chandigarh", country: "India", latitude: 30.7333, longitude: 76.7794, timezone: "Asia/Kolkata", elevation_m: 343.0, is_default: false },
  { id: 5, name: "Chennai", country: "India", latitude: 13.0827, longitude: 80.2707, timezone: "Asia/Kolkata", elevation_m: 12.0, is_default: false },
  { id: 6, name: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata", elevation_m: 214.0, is_default: false },
  { id: 7, name: "Guwahati", country: "India", latitude: 26.1445, longitude: 91.7362, timezone: "Asia/Kolkata", elevation_m: 52.0, is_default: false },
  { id: 8, name: "Hyderabad", country: "India", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata", elevation_m: 505.0, is_default: false },
  { id: 9, name: "Indore", country: "India", latitude: 22.7196, longitude: 75.8577, timezone: "Asia/Kolkata", elevation_m: 551.0, is_default: false },
  { id: 10, name: "Jaipur", country: "India", latitude: 26.9124, longitude: 75.7873, timezone: "Asia/Kolkata", elevation_m: 431.0, is_default: false },
  { id: 11, name: "Kochi", country: "India", latitude: 9.9312, longitude: 76.2673, timezone: "Asia/Kolkata", elevation_m: 6.0, is_default: false },
  { id: 12, name: "Kolkata", country: "India", latitude: 22.5726, longitude: 88.3639, timezone: "Asia/Kolkata", elevation_m: 12.0, is_default: false },
  { id: 13, name: "Lucknow", country: "India", latitude: 26.8467, longitude: 80.9462, timezone: "Asia/Kolkata", elevation_m: 117.0, is_default: false },
  { id: 14, name: "Mumbai", country: "India", latitude: 19.076, longitude: 72.8777, timezone: "Asia/Kolkata", elevation_m: 6.0, is_default: true },
  { id: 15, name: "Nagpur", country: "India", latitude: 21.1458, longitude: 79.0882, timezone: "Asia/Kolkata", elevation_m: 311.0, is_default: false },
  { id: 16, name: "Patna", country: "India", latitude: 25.5941, longitude: 85.1376, timezone: "Asia/Kolkata", elevation_m: 55.0, is_default: false },
  { id: 17, name: "Pune", country: "India", latitude: 18.5204, longitude: 73.8567, timezone: "Asia/Kolkata", elevation_m: 561.0, is_default: false },
  { id: 18, name: "Surat", country: "India", latitude: 21.1702, longitude: 72.8311, timezone: "Asia/Kolkata", elevation_m: 17.0, is_default: false },
  { id: 19, name: "Thiruvananthapuram", country: "India", latitude: 8.5241, longitude: 76.9366, timezone: "Asia/Kolkata", elevation_m: 12.0, is_default: false },
  { id: 20, name: "Visakhapatnam", country: "India", latitude: 17.6868, longitude: 83.2185, timezone: "Asia/Kolkata", elevation_m: 40.0, is_default: false },
];

export function DashboardProvider({ children }: { children: ReactNode }) {
  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: () => api<{ items: Location[] }>("locations"),
    initialData: { items: FALLBACK_LOCATIONS },
    staleTime: 60 * 60 * 1000,
  });
  const savedLocation = useSyncExternalStore(subscribe, storedLocation, () => null);
  const units = useSyncExternalStore(subscribe, storedUnits, () => "metric" as const);
  const locations = useMemo(
    () =>
      (locationsQuery.data?.items ?? [])
        .filter((item) => item.country === "India")
        .sort((left, right) => left.name.localeCompare(right.name)),
    [locationsQuery.data],
  );
  const preferred = locations.find((item) => item.is_default) || locations[0];
  const parsedLocation = savedLocation ? Number(savedLocation) : null;
  const locationId = locations.some((item) => item.id === parsedLocation) ? parsedLocation : preferred?.id ?? null;
  const location = locations.find((item) => item.id === locationId);
  const timeZone = location?.timezone || "UTC";
  const value = useMemo<DashboardValue>(
    () => ({
      locations,
      locationId,
      setLocationId: (id: number) => {
        window.localStorage.setItem("weatheriq.location", String(id));
        emit();
      },
      location,
      units,
      setUnits: (next) => {
        window.localStorage.setItem("weatheriq.units", next);
        emit();
      },
      timeZone,
    }),
    [location, locationId, locations, timeZone, units],
  );
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error("useDashboard must be used inside DashboardProvider");
  return value;
}
