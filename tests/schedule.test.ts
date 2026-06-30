import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { buildCron, parseCron, isDueThisHour } from "../lib/schedule";

describe("schedule", () => {
  it("builds a weekday cron", () => {
    expect(buildCron("05:30", [1, 2, 3, 4, 5])).toBe("30 5 * * 1,2,3,4,5");
  });

  it("uses * for all seven days", () => {
    expect(buildCron("09:00", [0, 1, 2, 3, 4, 5, 6])).toBe("0 9 * * *");
  });

  it("round-trips through parseCron", () => {
    expect(parseCron("30 5 * * 1,2,3,4,5")).toEqual({ time: "05:30", days: [1, 2, 3, 4, 5] });
  });

  it("parses a day range (default DB value)", () => {
    expect(parseCron("30 5 * * 1-5")).toEqual({ time: "05:30", days: [1, 2, 3, 4, 5] });
  });

  it("is due at the matching hour + weekday in the user's tz", () => {
    // 2026-06-29 is a Monday. 05:30 London.
    const now = DateTime.fromISO("2026-06-29T05:10:00", { zone: "Europe/London" });
    expect(isDueThisHour("30 5 * * 1-5", "Europe/London", now)).toBe(true);
  });

  it("is not due on a non-scheduled day", () => {
    // 2026-06-28 is a Sunday — not in 1-5.
    const now = DateTime.fromISO("2026-06-28T05:10:00", { zone: "Europe/London" });
    expect(isDueThisHour("30 5 * * 1-5", "Europe/London", now)).toBe(false);
  });

  it("respects timezone when deciding the hour", () => {
    // June → New York is EDT (UTC-4), so 05:10 NY == 09:10 UTC (Monday).
    const now = DateTime.fromISO("2026-06-29T09:10:00", { zone: "utc" });
    expect(isDueThisHour("30 5 * * 1-5", "America/New_York", now)).toBe(true);
    // One hour earlier (08:10 UTC = 04:10 NY) is not the scheduled hour.
    const early = DateTime.fromISO("2026-06-29T08:10:00", { zone: "utc" });
    expect(isDueThisHour("30 5 * * 1-5", "America/New_York", early)).toBe(false);
  });
});
