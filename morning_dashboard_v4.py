#!/usr/bin/env python3
"""
morning_dashboard_v4.py — Personal Morning Briefing Dashboard Generator

Improvements over v3:
  · 5th section: Deep Dive — rotating long-form wildcard analysis
  · Config-driven via config.yaml (falls back to built-in defaults)
  · CSS fixes: all flex gap values now have correct px units
  · Improved spacing and visual breathing room throughout
  · Wildcard history tracking prevents topic repetition (30-day window)
  · --force flag to regenerate an existing day's briefing
  · GitHub Actions ready — see .github/workflows/briefing.yml

Three API calls per run:
  1. Claude Sonnet + web search  — top stories, sectors, week ahead
  2. Claude Sonnet + web search  — deep dive (rotating long-form)
  3. Claude Haiku (no search)    — pattern watch (~20x cheaper)

Setup:
    pip3 install anthropic pyyaml
    export ANTHROPIC_API_KEY="sk-ant-..."

Usage:
    python3 morning_dashboard_v4.py
    python3 morning_dashboard_v4.py --config /path/to/config.yaml
    python3 morning_dashboard_v4.py --force   # regenerate today even if file exists
"""

import anthropic
import argparse
import datetime
import json
import os
import re
import sys
import time

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

# ── Runtime constants ────────────────────────────────────────────────────────
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
MAX_RETRIES = 3

# ── Default config (Harvey's setup — used when no config.yaml is found) ──────
DEFAULT_CONFIG = {
    "topics": [
        {
            "name": "Frontier Tech / AI",
            "description": (
                "AI, quantum computing, semiconductors/GPU supply chain, compute "
                "infrastructure, photonics, bio/biotech, space/launch, robotics"
            ),
        },
        {
            "name": "Applied Tech & Industry",
            "description": (
                "Big Tech strategy, startups & VC, enterprise AI adoption, "
                "major M&A/funding/IPOs/earnings, platform shifts, talent signals"
            ),
        },
        {
            "name": "US Policy & Power",
            "description": (
                "Tech regulation, fiscal/monetary, defense & industrial policy, "
                "White House & Congress, budget, judicial decisions, elections, science policy"
            ),
        },
        {
            "name": "AI Regulation & Governance",
            "description": (
                "US executive orders, EU AI Act, global frameworks, "
                "industry self-regulation, safety institutes"
            ),
        },
        {
            "name": "Geopolitics",
            "description": "US-China, Middle East, India, UK/EU, Latin America, Africa",
        },
        {
            "name": "China",
            "description": "Tech decoupling, economic health, Taiwan, industrial overcapacity",
        },
        {
            "name": "Markets",
            "description": (
                "Equities, rates/Fed, VC, commodities, central banks, "
                "inflation, bonds, currencies"
            ),
        },
        {
            "name": "Digital Finance",
            "description": "Crypto regulation, CBDCs, stablecoins, DeFi",
        },
        {
            "name": "Energy",
            "description": "Oil & gas, nuclear/renewables, AI infrastructure, grid",
        },
        {
            "name": "Defense & Security",
            "description": "Conflicts, military tech, cyber, intelligence",
        },
        {
            "name": "Labor & Workforce",
            "description": "AI displacement, immigration/talent, unions, remote work",
        },
    ],
    "sources": {
        "preferred": [
            "Financial Times",
            "Wall Street Journal",
            "Semafor",
            "Reuters",
            "Al Jazeera",
            "AP",
            "The Economist",
            "The Atlantic",
        ],
        "supplementary": ["Ars Technica", "TechCrunch", "Defense One"],
    },
    "sections": {
        "top_stories": True,
        "sector_scan": True,
        "week_ahead": True,
        "pattern_watch": True,
        "deep_dive": True,
    },
    "output": {
        "dir": "~/briefings",
    },
}


# ── Config loading ────────────────────────────────────────────────────────────

def load_config(config_path=None):
    """Load config.yaml if present, else return built-in defaults."""
    if config_path is None:
        config_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "config.yaml"
        )

    if os.path.exists(config_path):
        if not YAML_AVAILABLE:
            print(
                "Warning: config.yaml found but pyyaml not installed. "
                "Run: pip install pyyaml\nUsing built-in defaults."
            )
            return DEFAULT_CONFIG
        with open(config_path) as f:
            cfg = yaml.safe_load(f) or {}
        # Backfill any keys not present in the user's config
        for key, val in DEFAULT_CONFIG.items():
            if key not in cfg:
                cfg[key] = val
        return cfg

    return DEFAULT_CONFIG


# ── Config-aware prompt builders ──────────────────────────────────────────────

def build_system_prompt(cfg):
    topics = cfg["topics"]
    preferred = cfg["sources"]["preferred"]
    supplementary = cfg["sources"].get("supplementary", [])

    topic_lines = "\n".join(
        f"{i + 1}. {t['name']} — {t['description']}"
        for i, t in enumerate(topics)
    )
    preferred_str = ", ".join(preferred)
    supp_str = ", ".join(supplementary) if supplementary else "specialist trade outlets"

    return f"""You are my daily intelligence briefer. Each morning, search the web thoroughly
and deliver a concise, substantive briefing on what happened in the last 24 hours
and what's ahead this week.

MY TOPIC PRIORITIES (in order):

{topic_lines}

SEARCH APPROACH: Use 4-6 targeted searches across major outlets. Combine related
topics into single queries where possible. Prioritize original reporting.

PREFERRED SOURCES (weight these heavily):
{preferred_str}. Use these as primary sources wherever possible.
Supplement with specialist/trade outlets (e.g. {supp_str})
only when the preferred sources don't cover a topic.
"""


def build_format_instructions(cfg):
    topics = cfg["topics"]
    topic_names_quoted = ", ".join(f'"{t["name"]}"' for t in topics)
    n = len(topics)

    return f"""CRITICAL: Respond with ONLY valid JSON. No markdown, no explanation, no preamble,
no code fences. Just the raw JSON object.

{{
  "top_stories": [
    {{
      "priority": "urgent" | "high" | "tracking",
      "headline": "Short punchy headline",
      "one_liner": "One sentence on why this matters right now",
      "detail": "3-5 paragraphs. What happened, why it matters, where perspectives diverge (name specific outlets), what to watch next. Plain text, no markdown.",
      "sector": "Which of my {n} sectors this belongs to",
      "sources": [
        {{"name": "Publication Name", "url": "https://exact-article-url.com"}}
      ]
    }}
  ],
  "sectors": [
    {{
      "name": "Frontier Tech / AI",
      "has_news": true | false,
      "summary": "2-4 sentences if there is news. Empty string if quiet."
    }}
  ],
  "week_ahead": [
    {{
      "day": "Mon 6",
      "event": "Description of scheduled event",
      "tag": "critical" | "defense" | "space" | "data" | "earnings" | "policy" | "tech" | "other"
    }}
  ]
}}

REQUIREMENTS:
- top_stories: 3-5 items. At least 1 "urgent" if genuinely urgent news exists.
- sectors: All {n} topic areas. Exact names: {topic_names_quoted}.
  Set has_news to false and summary to "" if nothing meaningful happened.
- week_ahead: 6-12 scheduled events for the rest of this week.
- sources per story: 2-4 items. Use the actual URLs you retrieved during your web searches.
  Only include URLs you actually visited — do not fabricate them.

ONLY output the JSON. Nothing else.
"""


def build_deep_dive_prompt(cfg, history):
    topics_str = ", ".join(t["name"] for t in cfg["topics"])
    preferred_str = ", ".join(cfg["sources"]["preferred"])
    history_str = (
        "\n".join(f"- {h['date']}: {h['topic']}" for h in history[-14:])
        or "None yet."
    )

    return f"""You are writing a long-form intelligence brief for a sophisticated reader.

RECENT DEEP DIVE TOPICS — do not repeat any of these:
{history_str}

Pick ONE specific, timely subject from today's news that:
- Is genuinely interesting and topical RIGHT NOW — anchored in something that happened today or this week
- Intersects with these interest areas: {topics_str}
- Has real depth: competing interpretations, significant stakes, non-obvious angles
- Has NOT been covered recently (see list above)

Preferred sources: {preferred_str}

Search thoroughly, then write a long-form brief of 500-700 words. Cover:
1. The specific news hook — what happened today or this week
2. Deeper context and history that makes it matter
3. Competing perspectives — what reasonable people disagree about, and why
4. What to watch for next, and on what timeline

Return ONLY valid JSON — no markdown, no preamble, no code fences:
{{
  "topic": "Brief topic label, 5-10 words",
  "headline": "Sharp, specific headline",
  "standfirst": "One punchy sentence — the core argument or key fact",
  "body": "Full text, 500-700 words. Separate paragraphs with double newlines (\\n\\n). Plain text only — no markdown.",
  "why_today": "One sentence: why this subject is specifically relevant today",
  "sources": [
    {{"name": "Publication Name", "url": "https://exact-article-url.com"}}
  ]
}}
"""


# ── Pattern watch prompt ──────────────────────────────────────────────────────
PATTERN_PROMPT_BASE = """You are an intelligence analyst. Given the briefing data below, generate
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
"""


# ── HTML template ─────────────────────────────────────────────────────────────
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Morning Briefing — {{DATE}}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Source+Serif+4:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
    max-width: 720px; margin: 0 auto; padding: 0 24px 80px;
    color: #111827; background: #fff; line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Header ─────────────────────────────────────────────── */
  .header { padding-top: 40px; margin-bottom: 32px; }
  .header-label {
    font-size: 10px; font-weight: 600; letter-spacing: 0.12em;
    color: #9CA3AF; text-transform: uppercase; margin-bottom: 8px;
    font-family: 'JetBrains Mono', monospace;
  }
  .header h1 {
    font-size: 30px; font-weight: 700; color: #111827;
    font-family: 'Source Serif 4', Georgia, serif;
    line-height: 1.2; margin-bottom: 14px;
  }
  .status-bar {
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  }
  .status-urgent {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 11px; font-weight: 600; color: #DC2626;
    background: #FEE2E2; padding: 4px 12px; border-radius: 4px;
  }
  .pulse-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #DC2626;
    animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .status-count { font-size: 12px; color: #6B7280; }

  /* ── Tabs ────────────────────────────────────────────────── */
  .tabs {
    display: flex; gap: 2px; border-bottom: 1px solid #E5E7EB;
    margin-bottom: 28px; overflow-x: auto; -webkit-overflow-scrolling: touch;
  }
  .tab {
    padding: 10px 16px; font-size: 13px; font-weight: 500; color: #6B7280;
    background: none; border: none; border-bottom: 2px solid transparent;
    cursor: pointer; font-family: inherit; margin-bottom: -1px;
    white-space: nowrap; transition: color 0.15s ease;
  }
  .tab:hover { color: #374151; }
  .tab.active { font-weight: 700; color: #111827; border-bottom-color: #111827; }
  .arc-nav-link {
    margin-left: auto; padding: 9px 0 9px 12px;
    font-size: 12px; color: #6B7280; text-decoration: none;
    white-space: nowrap; display: flex; align-items: center; gap: 5px;
    flex-shrink: 0; transition: color 0.15s ease;
  }
  .arc-nav-link:hover { color: #374151; }
  .arc-nav-link svg { width: 13px; height: 13px; }
  .section { display: none; }
  .section.active { display: block; }
  .hint { font-size: 13px; color: #6B7280; margin-bottom: 20px; }

  /* ── Story cards ─────────────────────────────────────────── */
  .story {
    border: 1.5px solid #D1D5DB; border-radius: 10px;
    padding: 20px 24px; margin-bottom: 16px;
    cursor: pointer; background: #FAFAFA;
    transition: border-color 0.2s ease, background 0.2s ease;
    overflow: hidden;
  }
  .story:hover { border-color: #9CA3AF; }
  .story.expanded-urgent  { background: #FEF2F2; border-color: #DC2626; }
  .story.expanded-high    { background: #FFFBEB; border-color: #D97706; }
  .story.expanded-tracking{ background: #F9FAFB; border-color: #6B7280; }
  .story-top { display: flex; align-items: flex-start; gap: 16px; }
  .story-dot {
    width: 8px; height: 8px; border-radius: 50%;
    margin-top: 13px; flex-shrink: 0;
  }
  .dot-urgent   { background: #DC2626; }
  .dot-high     { background: #D97706; }
  .dot-tracking { background: #6B7280; }
  .story-content { flex: 1; min-width: 0; }
  .story-meta {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 8px; flex-wrap: wrap;
  }
  .priority-tag {
    font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
    padding: 2px 8px; border-radius: 3px; text-transform: uppercase;
  }
  .tag-urgent   { color: #991B1B; background: #FEE2E2; border: 1px solid #FECACA; }
  .tag-high     { color: #92400E; background: #FEF3C7; border: 1px solid #FDE68A; }
  .tag-tracking { color: #374151; background: #F3F4F6; border: 1px solid #D1D5DB; }
  .sector-label {
    font-size: 9px; font-weight: 500; color: #9CA3AF;
    letter-spacing: 0.06em; text-transform: uppercase;
  }
  .story h3 {
    font-size: 17px; font-weight: 700; color: #111827;
    margin: 0 0 6px; line-height: 1.3;
    font-family: 'Source Serif 4', Georgia, serif;
  }
  .story .one-liner { font-size: 13.5px; color: #4B5563; line-height: 1.5; }
  .chevron {
    font-size: 18px; color: #9CA3AF; margin-top: 8px; flex-shrink: 0;
    transition: transform 0.25s ease;
  }
  .story.expanded .chevron { transform: rotate(180deg); }
  .story-detail {
    max-height: 0; overflow: hidden; transition: max-height 0.5s ease;
  }
  .story.expanded .story-detail { max-height: 3000px; }
  .story-detail-inner {
    margin-top: 20px; padding-top: 18px;
    border-top: 1px solid rgba(0,0,0,0.07);
  }
  .story-detail p {
    font-size: 14px; color: #1F2937; line-height: 1.8;
    margin-bottom: 16px; padding-left: 24px;
  }
  .story-detail p:last-child { margin-bottom: 4px; }

  /* ── Sector items ────────────────────────────────────────── */
  .sector-item {
    padding: 14px 18px; border-radius: 8px; cursor: pointer;
    background: #FAFAFA; border: 1px solid #E5E7EB;
    transition: border-color 0.2s ease, background 0.2s ease;
    margin-bottom: 8px;
  }
  .sector-item:hover { border-color: #9CA3AF; background: #F9FAFB; }
  .sector-item.expanded { background: #EFF6FF; border-color: #3B82F6; }
  .sector-top { display: flex; align-items: center; gap: 14px; }
  .sector-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .sector-dot.active { background: #10B981; }
  .sector-dot.quiet  { background: transparent; border: 1.5px solid #D1D5DB; }
  .sector-name { font-size: 13.5px; font-weight: 600; color: #1F2937; }
  .sector-summary {
    font-size: 13.5px; color: #374151; line-height: 1.75;
    margin: 12px 0 2px 23px; display: none;
  }
  .sector-item.expanded .sector-summary { display: block; }

  /* ── Week ahead ──────────────────────────────────────────── */
  .week-item {
    display: flex; align-items: center; gap: 20px;
    padding: 14px 20px; border-radius: 8px; margin-bottom: 8px;
    background: #FAFAFA; border: 1px solid #E5E7EB;
  }
  .week-item.critical { background: #FEF2F2; border-color: #FECACA; }
  .week-day {
    font-size: 12px; font-weight: 700; color: #374151;
    font-family: 'JetBrains Mono', monospace; min-width: 72px; flex-shrink: 0;
  }
  .week-event { font-size: 13.5px; color: #1F2937; flex: 1; line-height: 1.4; }
  .week-tag {
    font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
    padding: 3px 10px; border-radius: 3px; text-transform: uppercase; flex-shrink: 0;
  }

  /* ── Pattern cards ───────────────────────────────────────── */
  .pattern {
    padding: 22px 26px; border-radius: 10px; cursor: pointer;
    background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
    border: 1px solid #334155; margin-bottom: 16px;
    transition: border-color 0.2s ease; overflow: hidden;
  }
  .pattern:hover { border-color: #475569; }
  .pattern.expanded { border-color: #64748B; }
  .pattern-top {
    display: flex; align-items: flex-start;
    justify-content: space-between; gap: 16px;
  }
  .pattern-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
    color: #94A3B8; margin-bottom: 8px; text-transform: uppercase;
    font-family: 'JetBrains Mono', monospace;
  }
  .pattern h3 {
    font-size: 18px; font-weight: 700; margin: 0 0 6px;
    font-family: 'Source Serif 4', Georgia, serif; color: #F1F5F9;
  }
  .pattern .subtitle {
    font-size: 13.5px; color: #94A3B8; font-weight: 500;
    margin-bottom: 10px; line-height: 1.5;
  }
  .pattern-cats { display: flex; gap: 6px; flex-wrap: wrap; }
  .pattern-cat {
    font-size: 9px; font-weight: 600; letter-spacing: 0.04em;
    color: #CBD5E1; background: #334155; padding: 2px 8px; border-radius: 3px;
  }
  .pattern .chevron { color: #64748B; flex-shrink: 0; }
  .pattern.expanded .chevron { transform: rotate(180deg); }
  .pattern-detail {
    max-height: 0; overflow: hidden; transition: max-height 0.5s ease;
  }
  .pattern.expanded .pattern-detail { max-height: 2000px; }
  .pattern-detail-inner {
    margin-top: 18px; border-top: 1px solid #1E293B; padding-top: 18px;
  }
  .pattern-detail p {
    font-size: 14px; color: #CBD5E1; line-height: 1.8; margin-bottom: 16px;
  }
  .pattern-detail p:last-child { margin-bottom: 4px; }

  /* ── Deep Dive ───────────────────────────────────────────── */
  .deep-dive { padding: 4px 0 0; }
  .deep-dive-kicker {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
    color: #6366F1; text-transform: uppercase;
    font-family: 'JetBrains Mono', monospace; margin-bottom: 16px;
  }
  .deep-dive-kicker-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #6366F1;
  }
  .deep-dive h2 {
    font-size: 26px; font-weight: 700; color: #111827; line-height: 1.25;
    font-family: 'Source Serif 4', Georgia, serif; margin-bottom: 14px;
  }
  .deep-dive .standfirst {
    font-size: 16px; color: #374151; line-height: 1.6; font-weight: 500;
    margin-bottom: 24px; padding-bottom: 24px;
    border-bottom: 1px solid #E5E7EB;
  }
  .deep-dive-why {
    font-size: 12.5px; color: #6B7280; font-style: italic;
    margin-bottom: 28px; padding: 12px 16px;
    background: #F5F3FF; border-left: 3px solid #6366F1;
    border-radius: 0 6px 6px 0; line-height: 1.5;
  }
  .deep-dive .body p {
    font-size: 15.5px; color: #1F2937; line-height: 1.85; margin-bottom: 22px;
    font-family: 'Source Serif 4', Georgia, serif;
  }
  .deep-dive .body p:last-child { margin-bottom: 0; }

  /* ── Sources ─────────────────────────────────────────────── */
  .story-sources, .deep-dive-sources {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    margin-top: 16px; padding-top: 14px;
    border-top: 1px solid rgba(0,0,0,0.06);
  }
  .deep-dive-sources { margin-top: 28px; padding-top: 22px; border-top: 1px solid #E5E7EB; }
  .sources-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.10em;
    color: #9CA3AF; text-transform: uppercase;
    font-family: 'JetBrains Mono', monospace; flex-shrink: 0;
  }
  .sources-list { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .source-link {
    font-size: 12px; color: #3B82F6; text-decoration: none;
    border-bottom: 1px solid #BFDBFE; line-height: 1.3; transition: color 0.15s;
  }
  .source-link:hover { color: #1D4ED8; border-bottom-color: #93C5FD; }
  .source-sep { font-size: 11px; color: #D1D5DB; }
</style>
</head>
<body>

<div class="header">
  <div class="header-label">DAILY INTELLIGENCE BRIEFING</div>
  <h1>{{DATE}}</h1>
  <div class="status-bar">
    <span class="status-urgent"><span class="pulse-dot"></span>&nbsp;{{URGENT_COUNT}} URGENT</span>
    <span class="status-count">{{ACTIVE_COUNT}} of {{TOTAL_SECTORS}} sectors active</span>
  </div>
</div>

<div class="tabs">
  <button class="tab active" onclick="showSection('stories', this)">Top Stories</button>
  <button class="tab" onclick="showSection('sectors', this)">Sector Scan</button>
  <button class="tab" onclick="showSection('week', this)">Week Ahead</button>
  <button class="tab" onclick="showSection('patterns', this)">Pattern Watch</button>
  <button class="tab" onclick="showSection('deepdive', this)">Deep Dive</button>
  <a class="arc-nav-link" href="./archive.html">
    Archive
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
  </a>
</div>

<div id="stories" class="section active">
  <p class="hint">Click any story to expand the full analysis.</p>
  {{STORIES_HTML}}
</div>

<div id="sectors" class="section">
  <p class="hint">Green dot = real news today. Click to expand.</p>
  {{SECTORS_HTML}}
</div>

<div id="week" class="section">
  {{WEEK_HTML}}
</div>

<div id="patterns" class="section">
  <p class="hint">Speculative analysis connecting dots across sectors. Click to expand.</p>
  {{PATTERNS_HTML}}
</div>

<div id="deepdive" class="section">
  {{DEEP_DIVE_HTML}}
</div>

<script>
function showSection(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}
function toggleStory(el) {
  const p = el.dataset.priority;
  if (el.classList.contains('expanded')) {
    el.classList.remove('expanded', 'expanded-urgent', 'expanded-high', 'expanded-tracking');
  } else {
    el.classList.add('expanded', 'expanded-' + p);
  }
}
function toggleSector(el)  { el.classList.toggle('expanded'); }
function togglePattern(el) { el.classList.toggle('expanded'); }
</script>
</body>
</html>"""


# ── HTML builders ─────────────────────────────────────────────────────────────

TAG_COLORS = {
    "critical": "#DC2626",
    "defense":  "#7C3AED",
    "space":    "#0284C7",
    "data":     "#059669",
    "earnings": "#D97706",
    "policy":   "#6366F1",
    "tech":     "#0891B2",
    "other":    "#6B7280",
}


def build_sources_html(sources, css_class="story-sources"):
    if not sources:
        return ""
    links = []
    for i, src in enumerate(sources):
        sep = '<span class="source-sep">·</span>' if i > 0 else ""
        links.append(
            f'{sep}<a class="source-link" href="{src["url"]}" target="_blank" rel="noopener">'
            f'{src["name"]}</a>'
        )
    return (
        f'<div class="{css_class}">'
        f'<span class="sources-label">SOURCES</span>'
        f'<div class="sources-list">{"".join(links)}</div>'
        f'</div>'
    )


def build_stories_html(stories):
    html = ""
    for s in stories:
        p = s["priority"]
        paragraphs = "\n".join(
            f"<p>{para.strip()}</p>"
            for para in s["detail"].split("\n\n")
            if para.strip()
        )
        sources_html = build_sources_html(s.get("sources", []))
        html += f"""
    <div class="story" data-priority="{p}" onclick="toggleStory(this)">
      <div class="story-top">
        <div class="story-dot dot-{p}"></div>
        <div class="story-content">
          <div class="story-meta">
            <span class="priority-tag tag-{p}">{p.upper()}</span>
            <span class="sector-label">{s['sector']}</span>
          </div>
          <h3>{s['headline']}</h3>
          <div class="one-liner">{s['one_liner']}</div>
        </div>
        <div class="chevron">▾</div>
      </div>
      <div class="story-detail">
        <div class="story-detail-inner">{paragraphs}{sources_html}</div>
      </div>
    </div>"""
    return html


def build_sectors_html(sectors):
    html = ""
    for s in sectors:
        dot_class = "active" if s["has_news"] else "quiet"
        summary = (
            f'<div class="sector-summary">{s["summary"]}</div>'
            if s.get("summary")
            else ""
        )
        html += f"""
    <div class="sector-item" onclick="toggleSector(this)">
      <div class="sector-top">
        <div class="sector-dot {dot_class}"></div>
        <span class="sector-name">{s['name']}</span>
      </div>
      {summary}
    </div>"""
    return html


def build_week_html(items):
    html = ""
    for item in items:
        critical = " critical" if item["tag"] == "critical" else ""
        color = TAG_COLORS.get(item["tag"], "#6B7280")
        html += f"""
    <div class="week-item{critical}">
      <span class="week-day">{item['day']}</span>
      <span class="week-event">{item['event']}</span>
      <span class="week-tag" style="color:#fff;background:{color}">{item['tag']}</span>
    </div>"""
    return html


def build_patterns_html(patterns):
    html = ""
    for p in patterns:
        cats = "".join(
            f'<span class="pattern-cat">{c}</span>' for c in p["categories"]
        )
        paragraphs = "\n".join(
            f"<p>{para.strip()}</p>"
            for para in p["content"].split("\n\n")
            if para.strip()
        )
        html += f"""
    <div class="pattern" onclick="togglePattern(this)">
      <div class="pattern-top">
        <div>
          <div class="pattern-label">SPECULATIVE ANALYSIS</div>
          <h3>{p['title']}</h3>
          <div class="subtitle">{p['subtitle']}</div>
          <div class="pattern-cats">{cats}</div>
        </div>
        <div class="chevron">▾</div>
      </div>
      <div class="pattern-detail">
        <div class="pattern-detail-inner">{paragraphs}</div>
      </div>
    </div>"""
    return html


def build_deep_dive_html(deep_dive):
    if not deep_dive or "headline" not in deep_dive:
        return '<p class="hint">Deep dive unavailable for this briefing.</p>'

    paragraphs = "\n".join(
        f"<p>{para.strip()}</p>"
        for para in deep_dive["body"].split("\n\n")
        if para.strip()
    )
    why_today = deep_dive.get("why_today", "")
    why_html = (
        f'<div class="deep-dive-why">{why_today}</div>' if why_today else ""
    )
    sources_html = build_sources_html(deep_dive.get("sources", []), "deep-dive-sources")

    return f"""
  <div class="deep-dive">
    <div class="deep-dive-kicker">
      <span class="deep-dive-kicker-dot"></span>TODAY'S DEEP DIVE
    </div>
    <h2>{deep_dive['headline']}</h2>
    <div class="standfirst">{deep_dive['standfirst']}</div>
    {why_html}
    <div class="body">{paragraphs}</div>
    {sources_html}
  </div>"""


def build_dashboard(data, date_str, cfg):
    stories_html   = build_stories_html(data["top_stories"])
    sectors_html   = build_sectors_html(data["sectors"])
    week_html      = build_week_html(data["week_ahead"])
    patterns_html  = build_patterns_html(data.get("pattern_watch", []))
    deep_dive_html = build_deep_dive_html(data.get("deep_dive"))

    urgent_count  = sum(1 for s in data["top_stories"] if s["priority"] == "urgent")
    active_count  = sum(1 for s in data["sectors"] if s["has_news"])
    total_sectors = len(data["sectors"])

    html = HTML_TEMPLATE
    html = html.replace("{{DATE}}",          date_str)
    html = html.replace("{{STORIES_HTML}}",  stories_html)
    html = html.replace("{{SECTORS_HTML}}",  sectors_html)
    html = html.replace("{{WEEK_HTML}}",     week_html)
    html = html.replace("{{PATTERNS_HTML}}", patterns_html)
    html = html.replace("{{DEEP_DIVE_HTML}}",deep_dive_html)
    html = html.replace("{{URGENT_COUNT}}",  str(urgent_count))
    html = html.replace("{{ACTIVE_COUNT}}",  str(active_count))
    html = html.replace("{{TOTAL_SECTORS}}", str(total_sectors))
    return html


# ── JSON extraction ────────────────────────────────────────────────────────────

def extract_json(text):
    """Robustly extract a JSON object or array from Claude's response."""
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```\s*$", "", text.strip())

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Find the first { or [ and balance from there
    for open_c, close_c in [('{', '}'), ('[', ']')]:
        start = text.find(open_c)
        if start == -1:
            continue

        depth = 0
        end = -1
        in_string = False
        escape_next = False

        for i in range(start, len(text)):
            c = text[i]
            if escape_next:
                escape_next = False
                continue
            if c == '\\' and in_string:
                escape_next = True
                continue
            if c == '"' and not escape_next:
                in_string = not in_string
                continue
            if in_string:
                continue
            if c == open_c:
                depth += 1
            elif c == close_c:
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break

        if end != -1:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                continue

    return None


# ── Wildcard history ───────────────────────────────────────────────────────────

def load_wildcard_history(output_dir):
    path = os.path.join(output_dir, "wildcard_history.json")
    if os.path.exists(path):
        try:
            with open(path) as f:
                return json.load(f)
        except Exception:
            pass
    return []


def save_wildcard_history(output_dir, history, new_topic):
    path = os.path.join(output_dir, "wildcard_history.json")
    history = list(history)  # don't mutate the caller's list
    history.append({"date": datetime.date.today().isoformat(), "topic": new_topic})
    history = history[-30:]  # keep 30 days
    os.makedirs(output_dir, exist_ok=True)
    with open(path, "w") as f:
        json.dump(history, f, indent=2)
    return history


# ── API calls ──────────────────────────────────────────────────────────────────

def _retry(fn, label, retries=MAX_RETRIES):
    """Run fn() up to retries+1 times with exponential back-off."""
    for attempt in range(retries + 1):
        try:
            return fn(attempt)
        except anthropic.RateLimitError:
            wait = 65 * (attempt + 1)
            print(f"  Rate limited. Waiting {wait}s...")
            if attempt < retries:
                time.sleep(wait)
            else:
                raise
        except Exception as e:
            wait = 30 * (attempt + 1)
            print(f"  {label} error (attempt {attempt + 1}/{retries + 1}): {e}")
            if attempt < retries:
                time.sleep(wait)
            else:
                raise


def generate_briefing_data(cfg, output_dir):
    print("  Calling Claude Sonnet (web search) — main briefing...")
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    today = datetime.date.today().strftime("%A, %B %d, %Y")
    system = build_system_prompt(cfg) + "\n\n" + build_format_instructions(cfg)

    def attempt(n):
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8000,
            system=system,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": f"Go. Today is {today}."}],
        )
        text_parts = [
            b.text for b in response.content
            if hasattr(b, "text") and b.text.strip()
        ]
        full_text = "\n".join(text_parts)

        if not full_text.strip():
            raise ValueError("Empty response from API")

        data = extract_json(full_text)
        if data is None:
            debug = os.path.join(output_dir, f"debug-main-{n}.txt")
            with open(debug, "w") as f:
                f.write(full_text)
            raise ValueError(f"No valid JSON found (debug saved to {debug})")

        missing = [k for k in ("top_stories", "sectors", "week_ahead") if k not in data]
        if missing:
            raise ValueError(f"Missing keys in response: {missing}")

        print(
            f"  ✓ {len(data['top_stories'])} stories, "
            f"{len(data['sectors'])} sectors, "
            f"{len(data['week_ahead'])} events"
        )
        return data

    return _retry(attempt, "main briefing")


def generate_deep_dive(cfg, output_dir):
    print("  Calling Claude Sonnet (web search) — deep dive...")
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    today = datetime.date.today().strftime("%A, %B %d, %Y")
    history = load_wildcard_history(output_dir)
    prompt = build_deep_dive_prompt(cfg, history) + f"\n\nToday is {today}."

    def attempt(n):
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=3000,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": prompt}],
        )
        text_parts = [
            b.text for b in response.content
            if hasattr(b, "text") and b.text.strip()
        ]
        data = extract_json("\n".join(text_parts))

        if data is None or "headline" not in data:
            raise ValueError("Deep dive returned no valid JSON with 'headline' key")

        save_wildcard_history(output_dir, history, data.get("topic", data["headline"]))
        print(f"  ✓ Deep dive: {data.get('topic', data['headline'])}")
        return data

    try:
        return _retry(attempt, "deep dive")
    except Exception as e:
        print(f"  Deep dive failed after all retries: {e}")
        return None


def generate_patterns(briefing_data):
    print("  Calling Claude Haiku — pattern analysis...")
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    payload = json.dumps({
        "top_stories": briefing_data["top_stories"],
        "sectors": briefing_data["sectors"],
    })

    def attempt(n):
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2500,
            messages=[{"role": "user", "content": PATTERN_PROMPT_BASE + payload}],
        )
        raw = response.content[0].text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```\s*$", "", raw)
        patterns = json.loads(raw)
        print(f"  ✓ {len(patterns)} pattern analyses")
        return patterns

    try:
        return _retry(attempt, "pattern watch")
    except Exception as e:
        print(f"  Pattern watch failed: {e}")
        return [{
            "title": "Pattern analysis unavailable",
            "subtitle": "Failed to generate — check logs",
            "categories": ["Error"],
            "content": str(e),
        }]


# ── Archive ───────────────────────────────────────────────────────────────────

def update_archive(output_dir):
    """Scan output_dir for all briefing-*.json files and regenerate archive.html."""
    import glob as _glob

    json_files = sorted(
        _glob.glob(os.path.join(output_dir, "briefing-*.json")),
        reverse=True,  # newest first
    )

    entries = []
    for jf in json_files:
        date_str = os.path.basename(jf).replace("briefing-", "").replace(".json", "")
        html_file = f"briefing-{date_str}.html"
        if not os.path.exists(os.path.join(output_dir, html_file)):
            continue
        try:
            date_obj = datetime.date.fromisoformat(date_str)
        except ValueError:
            continue
        try:
            with open(jf) as f:
                data = json.load(f)
            urgent  = sum(1 for s in data.get("top_stories", []) if s.get("priority") == "urgent")
            active  = sum(1 for s in data.get("sectors", []) if s.get("has_news"))
            n_stories = len(data.get("top_stories", []))
            deep_dive_topic = data.get("deep_dive", {}) or {}
            deep_dive_topic = deep_dive_topic.get("topic", "")
        except Exception:
            urgent = active = n_stories = 0
            deep_dive_topic = ""

        entries.append({
            "date_str":    date_str,
            "date_fmt":    date_obj.strftime("%A, %B %d, %Y"),
            "html_file":   html_file,
            "urgent":      urgent,
            "active":      active,
            "n_stories":   n_stories,
            "deep_dive":   deep_dive_topic,
        })

    today_str = datetime.date.today().isoformat()
    rows = ""
    for e in entries:
        is_today = e["date_str"] == today_str
        today_class = " today" if is_today else ""
        today_badge = '<span class="arc-today-badge">TODAY</span>' if is_today else ""
        urgent_badge = (
            f'<span class="arc-urgent">{e["urgent"]} URGENT</span>'
            if e["urgent"] else ""
        )
        dive_snippet = (
            f'<div class="arc-dive">↳ {e["deep_dive"]}</div>'
            if e["deep_dive"] else ""
        )
        rows += f"""
    <a class="arc-entry{today_class}" href="./{e['html_file']}">
      <div class="arc-date">{e['date_fmt']}</div>
      <div class="arc-meta">
        {today_badge}
        {urgent_badge}
        <span class="arc-stat">{e['active']} sectors active</span>
        <span class="arc-stat">{e['n_stories']} stories</span>
      </div>
      {dive_snippet}
    </a>"""

    today_file = f"briefing-{datetime.date.today().strftime('%Y-%m-%d')}.html"
    archive_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Briefing Archive</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Source+Serif+4:wght@700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'DM Sans', system-ui, sans-serif;
    max-width: 720px; margin: 0 auto; padding: 0 24px 80px;
    color: #111827; background: #fff; -webkit-font-smoothing: antialiased;
  }}
  .top-bar {{
    padding-top: 28px; margin-bottom: 32px;
    display: flex; align-items: center; justify-content: space-between;
  }}
  .back-link {{
    font-size: 13px; color: #6B7280; text-decoration: none;
    display: inline-flex; align-items: center; gap: 5px;
    transition: color 0.15s ease;
  }}
  .back-link:hover {{ color: #111827; }}
  .header-label {{
    font-size: 10px; font-weight: 600; letter-spacing: 0.12em;
    color: #9CA3AF; text-transform: uppercase; margin-bottom: 8px;
    font-family: 'JetBrains Mono', monospace;
  }}
  h1 {{
    font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 6px;
    font-family: 'Source Serif 4', Georgia, serif;
  }}
  .header-count {{ font-size: 13px; color: #6B7280; margin-bottom: 28px; }}
  .arc-entry {{
    display: block; text-decoration: none; color: inherit;
    padding: 16px 20px; border-radius: 8px; margin-bottom: 8px;
    background: #FAFAFA; border: 1px solid #E5E7EB;
    transition: border-color 0.2s ease, background 0.2s ease;
  }}
  .arc-entry:hover {{ border-color: #9CA3AF; background: #F3F4F6; }}
  .arc-entry.today {{ border-color: #111827; background: #F9FAFB; }}
  .arc-today-badge {{
    font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
    color: #111827; background: #F3F4F6; border: 1px solid #D1D5DB;
    padding: 2px 8px; border-radius: 3px; text-transform: uppercase;
  }}
  .arc-date {{
    font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 6px;
    font-family: 'Source Serif 4', Georgia, serif;
  }}
  .arc-meta {{
    display: flex; align-items: center; gap: 8px;
    flex-wrap: wrap; margin-bottom: 4px;
  }}
  .arc-urgent {{
    font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
    color: #991B1B; background: #FEE2E2; border: 1px solid #FECACA;
    padding: 2px 8px; border-radius: 3px; text-transform: uppercase;
  }}
  .arc-stat {{ font-size: 12px; color: #6B7280; }}
  .arc-dive {{ font-size: 12px; color: #6366F1; font-style: italic; margin-top: 2px; }}
</style>
</head>
<body>
<div class="top-bar">
  <a class="back-link" href="./{today_file}">
    ← Today's briefing
  </a>
</div>
<div class="header-label">MORNING BRIEFING</div>
<h1>Archive</h1>
<div class="header-count">{len(entries)} briefing{"s" if len(entries) != 1 else ""}</div>
{rows}
</body>
</html>"""

    archive_path = os.path.join(output_dir, "archive.html")
    with open(archive_path, "w") as f:
        f.write(archive_html)
    print(f"  archive.html updated ({len(entries)} entries)")


# ── Index redirect ────────────────────────────────────────────────────────────

def update_index(html_path, output_dir):
    filename = os.path.basename(html_path)
    index_path = os.path.join(output_dir, "index.html")
    with open(index_path, "w") as f:
        f.write(f"""<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=./{filename}">
  <title>Redirecting...</title>
</head>
<body><p>Redirecting to <a href="./{filename}">today's briefing</a>...</p></body>
</html>""")
    print(f"  index.html → {filename}")


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Morning Briefing Dashboard Generator")
    parser.add_argument("--config", default=None, help="Path to config.yaml")
    parser.add_argument(
        "--force", action="store_true",
        help="Regenerate even if today's briefing already exists"
    )
    args = parser.parse_args()

    if not ANTHROPIC_API_KEY:
        print("Error: set ANTHROPIC_API_KEY environment variable")
        sys.exit(1)

    cfg = load_config(args.config)
    output_dir = os.path.expanduser(
        os.environ.get(
            "BRIEFING_OUTPUT_DIR",
            cfg.get("output", {}).get("dir", "~/briefings"),
        )
    )
    os.makedirs(output_dir, exist_ok=True)

    today     = datetime.date.today()
    date_str  = today.strftime("%A, %B %d, %Y")
    file_date = today.strftime("%Y-%m-%d")
    html_path = os.path.join(output_dir, f"briefing-{file_date}.html")
    json_path = os.path.join(output_dir, f"briefing-{file_date}.json")

    if os.path.exists(html_path) and not args.force:
        print(f"Already generated for {file_date}. Use --force to regenerate.")
        return

    sections = cfg.get("sections", DEFAULT_CONFIG["sections"])

    start = time.time()
    print(f"=== Morning Briefing — {date_str} ===\n")

    # 1 — Main briefing
    print("[1/5] Main briefing (Sonnet + web search)...")
    data = generate_briefing_data(cfg, output_dir)

    # 2 — Deep dive
    if sections.get("deep_dive", True):
        print("[2/5] Deep dive (Sonnet + web search)...")
        data["deep_dive"] = generate_deep_dive(cfg, output_dir)
    else:
        print("[2/5] Deep dive disabled in config — skipping.")
        data["deep_dive"] = None

    # 3 — Pattern watch
    if sections.get("pattern_watch", True):
        print("[3/5] Pattern analysis (Haiku)...")
        data["pattern_watch"] = generate_patterns(data)
    else:
        print("[3/5] Pattern watch disabled in config — skipping.")
        data["pattern_watch"] = []

    # 4 — Save raw JSON
    print("[4/5] Saving data...")
    with open(json_path, "w") as f:
        json.dump(data, f, indent=2)

    # 5 — Build HTML + archive
    print("[5/5] Building dashboard...")
    html = build_dashboard(data, date_str, cfg)
    with open(html_path, "w") as f:
        f.write(html)
    update_index(html_path, output_dir)
    update_archive(output_dir)

    elapsed = time.time() - start
    print(f"\n✓ Done in {elapsed:.0f}s")
    print(f"  File:    {html_path}")
    print(f"  Data:    {json_path}")
    print(f"  Archive: {os.path.join(output_dir, 'archive.html')}")
    print(f"  Local:   open {html_path}")


if __name__ == "__main__":
    main()
