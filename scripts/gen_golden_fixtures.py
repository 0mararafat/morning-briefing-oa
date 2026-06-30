#!/usr/bin/env python3
"""Generate golden fixtures from the Python reference (reference/morning_dashboard_v4.py).

Captures each prompt builder's exact output + the inputs, so the TypeScript port
can be asserted byte-for-byte equal. Heavy deps (anthropic, feedparser) are
stubbed since we only call pure string builders.

Run from repo root:  python3 scripts/gen_golden_fixtures.py
"""
import importlib.util
import json
import os
import sys
import types

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIX = os.path.join(ROOT, "tests", "golden", "fixtures")
os.makedirs(FIX, exist_ok=True)

# Stub heavy imports the reference module makes at top level.
for mod in ("anthropic", "feedparser"):
    if mod not in sys.modules:
        sys.modules[mod] = types.ModuleType(mod)

spec = importlib.util.spec_from_file_location(
    "mb", os.path.join(ROOT, "reference", "morning_dashboard_v4.py")
)
mb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mb)


def write_text(name, text):
    with open(os.path.join(FIX, name), "w", encoding="utf-8") as f:
        f.write(text)


def write_json(name, obj):
    with open(os.path.join(FIX, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


# Effective config (with default backfill) — the single shared input.
cfg = mb.load_config(os.path.join(ROOT, "reference", "config.yaml"))
write_json("config.json", cfg)

# Fixed sample wildcard history (16 entries → exercises the last-14 slice).
history = [
    {"date": "2026-06-%02d" % i, "topic": "Sample deep dive topic number %d" % i}
    for i in range(1, 17)
]
write_json("history.json", history)

# Fixed today (deterministic).
today = "Monday, June 29, 2026"
today_iso = "2026-06-29"

# Fixed RSS content — exercises rss_fresh skip, slicing, and search-target branches.
rss_content = {
    "Ben Thompson": [
        {"title": "The Today Piece", "url": "https://stratechery.com/a",
         "published": today_iso, "summary": "A long summary " + ("x" * 350)},
        {"title": "An Older Piece", "url": "https://stratechery.com/b",
         "published": "2026-06-20", "summary": "Short older summary"},
    ],
    "Dan Wang": [
        {"title": "China industrial note", "url": "https://danwwang.substack.com/c",
         "published": "2026-06-25", "summary": "Notes on Chinese industrial policy"},
    ],
}
write_json("rss-content.json", rss_content)

# Sample briefing for the pattern payload + signal headlines.
sample = json.load(open(os.path.join(ROOT, "reference", "sample-briefing.json")))

# ── Prompt fixtures ──────────────────────────────────────────────────────────
write_text("system-prompt.txt", mb.build_system_prompt(cfg))
write_text("format-instructions.txt", mb.build_format_instructions(cfg))
write_text("deep-dive-prompt.txt", mb.build_deep_dive_prompt(cfg, history))
write_text("deep-dive-empty.txt", mb.build_deep_dive_prompt(cfg, []))

payload = json.dumps({"top_stories": sample["top_stories"], "sectors": sample["sectors"]})
write_text("pattern-prompt.txt", mb.PATTERN_PROMPT_BASE + payload)

# ── Signal-scan prompt — replicate the inline block from generate_signal_scan
#    verbatim with the fixed inputs above (the reference is the source of truth).
voices = cfg["voices"]
rss_ctx = []
search_targets = []
for voice in voices:
    name = voice["name"]
    handle = voice.get("x_handle")
    items = rss_content.get(name, [])
    custom_q = voice.get("search_query")
    if items:
        block = f"### {name}" + (f" (@{handle})" if handle else "") + "\n"
        for it in items[:3]:
            block += f"- [{it['title']}]({it['url']})"
            if it["published"]:
                block += f" — {it['published']}"
            block += "\n"
            if it["summary"]:
                block += f"  {it['summary'][:300]}…\n"
        rss_ctx.append(block)
        rss_fresh = any(it.get("published", "") == today_iso for it in items)
        if not rss_fresh:
            if custom_q:
                search_targets.append(f"{name}: search [{custom_q}]")
            elif handle:
                search_targets.append(f"{name} (@{handle}): search recent X/Twitter posts")
    else:
        if custom_q:
            search_targets.append(f"{name}: search [{custom_q}]")
        elif handle:
            search_targets.append(f"{name} (@{handle}): search recent X/Twitter posts")

rss_block = "\n".join(rss_ctx) or "No RSS content retrieved."
search_block = "\n".join(search_targets) or "None."
topics_str = ", ".join(t["name"] for t in cfg["topics"])
headlines = " | ".join(s.get("headline", "") for s in sample.get("top_stories", []))
all_names = [v["name"] for v in voices]

prompt = f"""Today is {today}.

Review recent output from a curated list of thinkers and analysts, then return a signal scan.

TODAY'S TOP STORIES: {headlines}
TODAY'S TOPIC AREAS: {topics_str}

RSS CONTENT RETRIEVED (last 7 days):
{rss_block}

VOICES TO SEARCH ON X / WEB (search ALL of these — combine with any RSS content above):
{search_block}

For each voice, combine their RSS content (if available above) with their most recent X posts, then return a JSON array covering ALL {len(all_names)} voices in this exact order: {', '.join(all_names)}

[
  {{
    "name": "Exact name as listed above",
    "handle": "@handle or empty string",
    "source": "substack" | "newsletter" | "x" | "essay" | "blog" | "mixed",
    "signal": "strong" | "light" | "none",
    "latest_title": "Title of most recent piece or post, or empty string",
    "url": "Direct URL, or empty string",
    "summary": "1-2 sentences on what they wrote or said. Empty string if nothing in 7 days.",
    "connection": "How this connects to today's stories/topics. Empty string if none."
  }}
]

Signal levels: "strong" = substantive piece or thread (>200 words). "light" = brief post or short take. "none" = nothing in the last 7 days.
Skip purely promotional, congratulatory, or off-topic content.
IMPORTANT: Make at most 1 web search per voice. Do not search exhaustively.
Return ONLY the JSON array. No markdown, no preamble."""
write_text("signal-scan-prompt.txt", prompt)

print("Wrote fixtures to", FIX)
print("Files:", sorted(os.listdir(FIX)))
