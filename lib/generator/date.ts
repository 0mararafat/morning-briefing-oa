import { DateTime } from "luxon";

// Compute "today" in a user's timezone.
//   human → matches Python strftime("%A, %B %d, %Y"), e.g. "Monday, June 29, 2026"
//   iso   → "YYYY-MM-DD"
// `now` is injectable for deterministic tests.
export function formatToday(
  tz: string,
  now?: DateTime
): { human: string; iso: string } {
  const dt = (now ?? DateTime.now()).setZone(tz).setLocale("en-US");
  return {
    human: dt.toFormat("cccc, LLLL dd, yyyy"),
    iso: dt.toISODate() ?? "",
  };
}
