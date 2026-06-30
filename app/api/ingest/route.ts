import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { resolveIngestToken } from "@/lib/tokens";
import { checkRateLimit } from "@/lib/rate-limit";
import { getGeneratorState, saveGeneratorState } from "@/lib/state";
import { toGeneratorConfig } from "@/lib/config";
import { IngestedBriefingSchema } from "@/lib/generator/briefing-schema";
import { buildDashboardHtml } from "@/lib/generator/render/render";
import type { Briefing, Config } from "@/lib/generator/types";

// Fallback config (sections only) used to render when a user has no config row.
const FALLBACK_CONFIG: Config = {
  topics: [],
  sources: { preferred: [], supplementary: [] },
  sections: {
    top_stories: true,
    sector_scan: true,
    week_ahead: true,
    pattern_watch: true,
    deep_dive: true,
    signal_scan: true,
  },
  voices: [],
  signal_scan_frequency: "weekly",
};

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export async function POST(req: Request) {
  // 1. Auth via ingest token
  const raw = bearer(req);
  if (!raw) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }
  const userId = await resolveIngestToken(raw);
  if (!userId) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 1a. Rate limit per token — a daily routine needs only a handful of posts;
  // this bounds a leaked token or a runaway routine without tripping retries.
  const rl = await checkRateLimit(`ingest:${userId}`, 20, 600);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  // 2. Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { date: rawDate, data } = (body ?? {}) as { date?: unknown; data?: unknown };

  // Load the user's config first — we need their timezone to anchor the date.
  const cfgRow = await prisma.userConfig.findUnique({ where: { userId } });
  const cfg = cfgRow ? toGeneratorConfig(cfgRow) : FALLBACK_CONFIG;
  const timezone = cfgRow?.timezone ?? "Europe/London";

  // The briefing date is always anchored to the user's timezone, never the
  // routine container's clock (which is typically UTC and can be a day off).
  // An explicit, well-formed `date` is honoured (e.g. manual backfills); a
  // missing date defaults to "today" in the user's timezone; a malformed date
  // is rejected so mistakes surface rather than silently shifting the day.
  let date: string;
  if (rawDate == null) {
    date = DateTime.now().setZone(timezone).toISODate()!;
  } else if (typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    date = rawDate;
  } else {
    return NextResponse.json({ error: "Invalid 'date' (expected YYYY-MM-DD)" }, { status: 400 });
  }

  let parsed: Briefing;
  try {
    parsed = IngestedBriefingSchema.parse(data) as Briefing;
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Invalid briefing data", issues: err.issues }, { status: 422 });
    }
    throw err;
  }

  // 3. Render with the user's config (same renderer as API mode)
  const human = DateTime.fromISO(date).setLocale("en-US").toFormat("cccc, LLLL dd, yyyy");
  const html = buildDashboardHtml(parsed, human, cfg);

  // 4. Upsert briefing (idempotent on userId+date)
  await prisma.briefing.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, data: parsed as unknown as object, html, source: "CLAUDE_ROUTINE" },
    update: { data: parsed as unknown as object, html, source: "CLAUDE_ROUTINE" },
  });

  // 5. Advance wildcard history with the deep-dive topic
  if (parsed.deep_dive?.topic) {
    const state = await getGeneratorState(userId);
    const wildcardHistory = [
      ...state.wildcardHistory,
      { date, topic: parsed.deep_dive.topic },
    ].slice(-30);
    await saveGeneratorState(userId, { ...state, wildcardHistory });
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/briefings/${date}`;
  return NextResponse.json({ ok: true, url });
}
