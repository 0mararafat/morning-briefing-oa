import {
  buildSystemPrompt,
  buildFormatInstructions,
  buildDeepDivePrompt,
  PATTERN_PROMPT_BASE,
} from "@/lib/generator/prompts";
import type { Config, WildcardEntry } from "@/lib/generator/types";

// Build the ready-to-paste prompt the user drops into a scheduled Claude Code
// routine. It reuses the SAME prompt builders as API mode so the briefing comes
// out identical, then instructs Claude to assemble one JSON object and POST it
// to the ingest endpoint.
export function buildRoutinePrompt(opts: {
  cfg: Config;
  history: WildcardEntry[];
  ingestUrl: string;
  token: string;
  timezone: string;
}): string {
  const { cfg, history, ingestUrl, token, timezone } = opts;
  const voicesList = cfg.voices
    .map((v) => {
      const handle = v.x_handle ? ` (@${v.x_handle})` : "";
      const rss = v.rss ? ` rss:${v.rss}` : "";
      const q = v.search_query ? ` search:[${v.search_query}]` : "";
      return `- ${v.name}${handle}${rss}${q}`;
    })
    .join("\n");

  return `You are generating my daily intelligence briefing. My timezone is ${timezone}. "Today" always means the current date in ${timezone} — compute it there, not in UTC or wherever you happen to run, so the briefing never lands on the wrong day.

Do thorough web research yourself, then produce ONE JSON object and POST it to my
briefing app (instructions at the end). Follow these section specs exactly.

═══════════════════════════════════════════════════════════════════════════════
SECTION 1–3 — TOP STORIES, SECTORS, WEEK AHEAD
${buildSystemPrompt(cfg)}
${buildFormatInstructions(cfg)}

═══════════════════════════════════════════════════════════════════════════════
SECTION 4 — DEEP DIVE
${buildDeepDivePrompt(cfg, history)}

═══════════════════════════════════════════════════════════════════════════════
SECTION 5 — PATTERN WATCH
${PATTERN_PROMPT_BASE}(use the top_stories and sectors you produced above as the briefing data)

═══════════════════════════════════════════════════════════════════════════════
SECTION 6 — SIGNAL SCAN
Review recent output (last 7 days) from these voices and return a JSON array.
For each: name, handle ("@h" or ""), source, signal ("strong"|"light"|"none"),
latest_title, url, summary, connection. Cover ALL voices in this order:
${voicesList}

═══════════════════════════════════════════════════════════════════════════════
ASSEMBLE & SEND

Combine everything into ONE JSON object with these keys:
{
  "top_stories": [...],      // from section 1-3
  "sectors": [...],
  "week_ahead": [...],
  "deep_dive": {...},        // from section 4
  "pattern_watch": [...],    // from section 5
  "signal_scan": [...]       // from section 6
}

Then POST it with a tool/curl:

  curl -X POST "${ingestUrl}" \\
    -H "Authorization: Bearer ${token}" \\
    -H "Content-Type: application/json" \\
    -d '{"data": <the JSON object above> }'

Do NOT include a "date" field — the app stamps the briefing with today's date in
my timezone (${timezone}) automatically, so it can never land on the wrong day.
Confirm you received HTTP 200.`;
}
