import { describe, expect, it } from "vitest";
import { dateKeyInTimeZone, daylightDetails } from "@/lib/format";

describe("dateKeyInTimeZone", () => {
  it("uses the location's local calendar date instead of UTC", () => {
    expect(dateKeyInTimeZone("2026-11-02T18:30:00Z", "Asia/Kolkata")).toBe("2026-11-03");
  });

  describe("daylightDetails", () => {
    it("calculates daylight duration and local solar times", () => {
      expect(daylightDetails("2026-11-04T01:10:00Z", "2026-11-04T12:33:00Z", "Asia/Kolkata")).toEqual({
        duration: "11h 23m",
        solarNoon: "12:21",
        sunrisePercent: (6 * 60 + 40) / 1440 * 100,
        sunsetPercent: (18 * 60 + 3) / 1440 * 100,
      });
    });

    it("returns null when the sunrise and sunset times are unavailable or invalid", () => {
      expect(daylightDetails(null, "2026-11-04T12:33:00Z", "Asia/Kolkata")).toBeNull();
      expect(daylightDetails("invalid", "2026-11-04T12:33:00Z", "Asia/Kolkata")).toBeNull();
    });
  });

  it("returns null for a missing or invalid date", () => {
    expect(dateKeyInTimeZone(null, "Asia/Kolkata")).toBeNull();
    expect(dateKeyInTimeZone("not a date", "Asia/Kolkata")).toBeNull();
  });
});
