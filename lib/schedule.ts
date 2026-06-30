import { DateTime } from "luxon";

// Cron is stored as a 5-field expression interpreted in the user's timezone
// (no UTC conversion — the scheduler evaluates it with the tz, so DST is handled
// automatically). Day field: 0=Sun..6=Sat, comma-separated, or "*" for all.

export function buildCron(time: string, days: number[]): string {
  const [hh, mm] = time.split(":");
  const hour = parseInt(hh, 10);
  const min = parseInt(mm, 10);
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const dayPart = sorted.length === 7 ? "*" : sorted.join(",");
  return `${min} ${hour} * * ${dayPart}`;
}

function expandDayField(field: string): number[] {
  if (field === "*") return [0, 1, 2, 3, 4, 5, 6];
  const out = new Set<number>();
  for (const part of field.split(",")) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((n) => parseInt(n, 10));
      for (let i = a; i <= b; i++) out.add(i % 7);
    } else {
      out.add(parseInt(part, 10) % 7);
    }
  }
  return [...out].sort((a, b) => a - b);
}

export function parseCron(cron: string): { time: string; days: number[] } {
  const fields = cron.trim().split(/\s+/);
  const min = parseInt(fields[0] ?? "30", 10);
  const hour = parseInt(fields[1] ?? "5", 10);
  const days = expandDayField(fields[4] ?? "1-5");
  const pad = (n: number) => String(n).padStart(2, "0");
  return { time: `${pad(hour)}:${pad(min)}`, days };
}

// Luxon weekday is 1=Mon..7=Sun; normalize to 0=Sun..6=Sat.
function luxonDow(dt: DateTime): number {
  return dt.weekday === 7 ? 0 : dt.weekday;
}

// True if the cron's hour + day-of-week match `now` in the given timezone.
// Used by the hourly Inngest scheduler to decide who is due this hour.
export function isDueThisHour(
  cron: string,
  timezone: string,
  now: DateTime = DateTime.now()
): boolean {
  const dt = now.setZone(timezone);
  const fields = cron.trim().split(/\s+/);
  const hour = parseInt(fields[1] ?? "5", 10);
  const days = expandDayField(fields[4] ?? "1-5");
  return dt.hour === hour && days.includes(luxonDow(dt));
}
