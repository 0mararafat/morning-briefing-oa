// Prompt builders — ported VERBATIM from morning_dashboard_v4.py.
// Any change to whitespace/wording here is a parity regression; the golden
// tests (tests/golden/prompts.test.ts) assert byte-for-byte equality against
// fixtures captured from the Python reference.

import type { Config, BriefingData, RssContent, Voice, WildcardEntry } from "./types";

// build_system_prompt(cfg)
export function buildSystemPrompt(cfg: Config): string {
  const topics = cfg.topics;
  const preferred = cfg.sources.preferred;
  const supplementary = cfg.sources.supplementary ?? [];

  const topicLines = topics
    .map((t, i) => `${i + 1}. ${t.name} — ${t.description}`)
    .join("\n");
  const preferredStr = preferred.join(", ");
  const suppStr =
    supplementary.length > 0 ? supplementary.join(", ") : "specialist trade outlets";

  return `You are my daily intelligence briefer. Each morning, search the web thoroughly
and deliver a concise, substantive briefing on what happened in the last 24 hours
and what's ahead this week.

MY TOPIC PRIORITIES (in order):

${topicLines}

SEARCH APPROACH: Use 4-6 targeted searches across major outlets. Combine related
topics into single queries where possible. Prioritize original reporting.

PREFERRED SOURCES (weight these heavily):
${preferredStr}. Use these as primary sources wherever possible.
Supplement with specialist/trade outlets (e.g. ${suppStr})
only when the preferred sources don't cover a topic.
`;
}

// build_format_instructions(cfg)
export function buildFormatInstructions(cfg: Config): string {
  const topics = cfg.topics;
  const topicNamesQuoted = topics.map((t) => `"${t.name}"`).join(", ");
  const n = topics.length;

  return `CRITICAL: Respond with ONLY valid JSON. No markdown, no explanation, no preamble,
no code fences. Just the raw JSON object.

{
  "top_stories": [
    {
      "priority": "urgent" | "high" | "tracking",
      "headline": "Short punchy headline",
      "one_liner": "One sentence on why this matters right now",
      "detail": "3-5 paragraphs. What happened, why it matters, where perspectives diverge (name specific outlets), what to watch next. Plain text, no markdown.",
      "sector": "Which of my ${n} sectors this belongs to",
      "sources": [
        {"name": "Publication Name", "url": "https://exact-article-url.com"}
      ]
    }
  ],
  "sectors": [
    {
      "name": "Frontier Tech / AI",
      "has_news": true | false,
      "summary": "2-4 sentences if there is news. Empty string if quiet."
    }
  ],
  "week_ahead": [
    {
      "day": "Mon 6",
      "event": "Description of scheduled event",
      "tag": "critical" | "defense" | "space" | "data" | "earnings" | "policy" | "tech" | "other"
    }
  ]
}

REQUIREMENTS:
- top_stories: 3-5 items. At least 1 "urgent" if genuinely urgent news exists.
- sectors: All ${n} topic areas. Exact names: ${topicNamesQuoted}.
  Set has_news to false and summary to "" if nothing meaningful happened.
- week_ahead: 6-12 scheduled events for the rest of this week.
- sources per story: 2-4 items. Use the actual URLs you retrieved during your web searches.
  Only include URLs you actually visited — do not fabricate them.

ONLY output the JSON. Nothing else.
`;
}

// build_deep_dive_prompt(cfg, history)
export function buildDeepDivePrompt(cfg: Config, history: WildcardEntry[]): string {
  const topicsStr = cfg.topics.map((t) => t.name).join(", ");
  const preferredStr = cfg.sources.preferred.join(", ");
  const historyStr =
    history
      .slice(-14)
      .map((h) => `- ${h.date}: ${h.topic}`)
      .join("\n") || "None yet.";

  return `You are writing a long-form intelligence brief for a sophisticated reader.

RECENT DEEP DIVE TOPICS — do not repeat any of these:
${historyStr}

Pick ONE specific, timely subject from today's news that:
- Is genuinely interesting and topical RIGHT NOW — anchored in something that happened today or this week
- Intersects with these interest areas: ${topicsStr}
- Has real depth: competing interpretations, significant stakes, non-obvious angles
- Has NOT been covered recently (see list above)

Preferred sources: ${preferredStr}

Search thoroughly, then write a long-form brief of 500-700 words. Cover:
1. The specific news hook — what happened today or this week
2. Deeper context and history that makes it matter
3. Competing perspectives — what reasonable people disagree about, and why
4. What to watch for next, and on what timeline

Return ONLY valid JSON — no markdown, no preamble, no code fences:
{
  "topic": "Brief topic label, 5-10 words",
  "headline": "Sharp, specific headline",
  "standfirst": "One punchy sentence — the core argument or key fact",
  "body": "Full text, 500-700 words. Separate paragraphs with double newlines (\\n\\n). Plain text only — no markdown.",
  "why_today": "One sentence: why this subject is specifically relevant today",
  "sources": [
    {"name": "Publication Name", "url": "https://exact-article-url.com"}
  ]
}
`;
}

// PATTERN_PROMPT_BASE (plain string; payload is appended by the caller)
export const PATTERN_PROMPT_BASE = `You are an intelligence analyst. Given the briefing data below, generate
pattern_watch analyses: speculative, cross-sector dot-connecting. Bold and opinionated.
Sharp wrong takes beat safe observations.

Return ONLY a valid JSON array — no markdown, no preamble, no code fences.

[
  {
    "title": "Short punchy title",
    "subtitle": "One-line thesis",
    "categories": ["Sector1", "Sector2"],
    "content": "2-3 paragraphs of speculative analysis connecting dots across sectors. Label as speculative. Plain text, no markdown."
  }
]

Requirements:
- 3-4 items
- Each must connect at least 2 sectors from the briefing
- Be bold and specific — name companies, people, policies
- Sharp wrong takes beat safe observations

Briefing data:
`;

// Build the signal-scan prompt, including the RSS-context construction and the
// "fresh today → skip X search" logic. Ported from generate_signal_scan().
export function buildSignalScanPrompt(
  voices: Voice[],
  rssContent: RssContent,
  briefingData: Pick<BriefingData, "top_stories">,
  cfg: Config,
  todayHuman: string,
  todayIso: string
): string {
  const rssContext: string[] = [];
  const searchTargets: string[] = [];

  for (const voice of voices) {
    const name = voice.name;
    const handle = voice.x_handle;
    const items = rssContent[name] ?? [];
    const customQ = voice.search_query;

    if (items.length > 0) {
      let block = `### ${name}` + (handle ? ` (@${handle})` : "") + "\n";
      for (const it of items.slice(0, 3)) {
        block += `- [${it.title}](${it.url})`;
        if (it.published) {
          block += ` — ${it.published}`;
        }
        block += "\n";
        if (it.summary) {
          block += `  ${it.summary.slice(0, 300)}…\n`;
        }
      }
      rssContext.push(block);

      // Only search X if RSS content is not from today — skip if already fresh
      const rssFresh = items.some((it) => (it.published ?? "") === todayIso);
      if (!rssFresh) {
        if (customQ) {
          searchTargets.push(`${name}: search [${customQ}]`);
        } else if (handle) {
          searchTargets.push(`${name} (@${handle}): search recent X/Twitter posts`);
        }
      }
    } else {
      // No RSS at all — always search
      if (customQ) {
        searchTargets.push(`${name}: search [${customQ}]`);
      } else if (handle) {
        searchTargets.push(`${name} (@${handle}): search recent X/Twitter posts`);
      }
    }
  }

  const rssBlock = rssContext.join("\n") || "No RSS content retrieved.";
  const searchBlock = searchTargets.join("\n") || "None.";
  const topicsStr = cfg.topics.map((t) => t.name).join(", ");
  const headlines = (briefingData.top_stories ?? [])
    .map((s) => s.headline ?? "")
    .join(" | ");
  const allNames = voices.map((v) => v.name);

  return `Today is ${todayHuman}.

Review recent output from a curated list of thinkers and analysts, then return a signal scan.

TODAY'S TOP STORIES: ${headlines}
TODAY'S TOPIC AREAS: ${topicsStr}

RSS CONTENT RETRIEVED (last 7 days):
${rssBlock}

VOICES TO SEARCH ON X / WEB (search ALL of these — combine with any RSS content above):
${searchBlock}

For each voice, combine their RSS content (if available above) with their most recent X posts, then return a JSON array covering ALL ${allNames.length} voices in this exact order: ${allNames.join(", ")}

[
  {
    "name": "Exact name as listed above",
    "handle": "@handle or empty string",
    "source": "substack" | "newsletter" | "x" | "essay" | "blog" | "mixed",
    "signal": "strong" | "light" | "none",
    "latest_title": "Title of most recent piece or post, or empty string",
    "url": "Direct URL, or empty string",
    "summary": "1-2 sentences on what they wrote or said. Empty string if nothing in 7 days.",
    "connection": "How this connects to today's stories/topics. Empty string if none."
  }
]

Signal levels: "strong" = substantive piece or thread (>200 words). "light" = brief post or short take. "none" = nothing in the last 7 days.
Skip purely promotional, congratulatory, or off-topic content.
IMPORTANT: Make at most 1 web search per voice. Do not search exhaustively.
Return ONLY the JSON array. No markdown, no preamble.`;
}
