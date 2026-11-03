import { describe, expect, it } from "vitest";
import { dateKeyInTimeZone } from "@/lib/format";

describe("dateKeyInTimeZone", () => {
  it("uses the location's local calendar date instead of UTC", () => {
    expect(dateKeyInTimeZone("2026-11-02T18:30:00Z", "Asia/Kolkata")).toBe("2026-11-03");
  });

  it("returns null for a missing or invalid date", () => {
    expect(dateKeyInTimeZone(null, "Asia/Kolkata")).toBeNull();
    expect(dateKeyInTimeZone("not a date", "Asia/Kolkata")).toBeNull();
  });
});
