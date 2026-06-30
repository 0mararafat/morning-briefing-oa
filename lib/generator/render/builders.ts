// HTML builders — structure ported from morning_dashboard_v4.py's build_*_html,
// restyled to the design tokens. Unlike the Python reference, text content is
// HTML-escaped (routine-mode ingests arbitrary JSON, so escaping is required).

import type {
  DeepDive,
  Pattern,
  Sector,
  Signal,
  Story,
  StorySource,
  WeekEvent,
} from "../types";

export const TAG_COLORS: Record<string, string> = {
  critical: "#DC2626",
  defense: "#7C3AED",
  space: "#0284C7",
  data: "#059669",
  earnings: "#D97706",
  policy: "#6366F1",
  tech: "#0891B2",
  other: "#6B7280",
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraphs(text: string): string {
  return (text ?? "")
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("\n");
}

export function buildSourcesHtml(
  sources: StorySource[] = [],
  cssClass = "story-sources"
): string {
  if (!sources || sources.length === 0) return "";
  const links = sources
    .map((src, i) => {
      const sep = i > 0 ? '<span class="source-sep">·</span>' : "";
      return `${sep}<a class="source-link" href="${escapeHtml(src.url)}" target="_blank" rel="noopener">${escapeHtml(src.name)}</a>`;
    })
    .join("");
  return `<div class="${cssClass}"><span class="sources-label">SOURCES</span><div class="sources-list">${links}</div></div>`;
}

export function buildStoriesHtml(stories: Story[]): string {
  return stories
    .map((s) => {
      const p = s.priority;
      const para = paragraphs(s.detail);
      const sources = buildSourcesHtml(s.sources ?? []);
      return `
    <div class="story" data-priority="${escapeHtml(p)}" onclick="toggleCard(this)">
      <div class="card-top">
        <div class="story-dot dot-${escapeHtml(p)}"></div>
        <div class="story-content">
          <div class="story-meta">
            <span class="priority-tag tag-${escapeHtml(p)}">${escapeHtml(p.toUpperCase())}</span>
            <span class="sector-label">${escapeHtml(s.sector)}</span>
          </div>
          <h3>${escapeHtml(s.headline)}</h3>
          <div class="one-liner">${escapeHtml(s.one_liner)}</div>
        </div>
        <div class="chevron">▾</div>
      </div>
      <div class="card-detail">
        <div class="card-detail-inner">${para}${sources}</div>
      </div>
    </div>`;
    })
    .join("");
}

export function buildSectorsHtml(sectors: Sector[]): string {
  return sectors
    .map((s) => {
      const dotClass = s.has_news ? "active" : "quiet";
      const summary = s.summary
        ? `<div class="sector-summary">${escapeHtml(s.summary)}</div>`
        : "";
      return `
    <div class="sector-item">
      <div class="sector-top">
        <div class="sector-dot ${dotClass}"></div>
        <span class="sector-name">${escapeHtml(s.name)}</span>
      </div>
      ${summary}
    </div>`;
    })
    .join("");
}

export function buildWeekHtml(items: WeekEvent[]): string {
  return items
    .map((item) => {
      const critical = item.tag === "critical" ? " critical" : "";
      const color = TAG_COLORS[item.tag] ?? "#6B7280";
      return `
    <div class="week-item${critical}">
      <span class="week-day">${escapeHtml(item.day)}</span>
      <span class="week-event">${escapeHtml(item.event)}</span>
      <span class="week-tag" style="color:#fff;background:${color}">${escapeHtml(item.tag)}</span>
    </div>`;
    })
    .join("");
}

export function buildPatternsHtml(patterns: Pattern[]): string {
  return patterns
    .map((p) => {
      const cats = (p.categories ?? [])
        .map((c) => `<span class="pattern-cat">${escapeHtml(c)}</span>`)
        .join("");
      const para = paragraphs(p.content);
      return `
    <div class="pattern" onclick="toggleCard(this)">
      <div class="card-top">
        <div>
          <div class="pattern-label">SPECULATIVE ANALYSIS</div>
          <h3>${escapeHtml(p.title)}</h3>
          <div class="subtitle">${escapeHtml(p.subtitle)}</div>
          <div class="pattern-cats">${cats}</div>
        </div>
        <div class="chevron">▾</div>
      </div>
      <div class="card-detail">
        <div class="card-detail-inner">${para}</div>
      </div>
    </div>`;
    })
    .join("");
}

export function buildDeepDiveHtml(deepDive?: DeepDive | null): string {
  if (!deepDive || !("headline" in deepDive)) {
    return '<p class="hint">Deep dive unavailable for this briefing.</p>';
  }
  const para = paragraphs(deepDive.body);
  const whyHtml = deepDive.why_today
    ? `<div class="deep-dive-why">${escapeHtml(deepDive.why_today)}</div>`
    : "";
  const sources = buildSourcesHtml(deepDive.sources ?? [], "deep-dive-sources");
  return `
  <div class="deep-dive">
    <div class="deep-dive-kicker"><span class="deep-dive-kicker-dot"></span>TODAY'S DEEP DIVE</div>
    <h2>${escapeHtml(deepDive.headline)}</h2>
    <div class="standfirst">${escapeHtml(deepDive.standfirst)}</div>
    ${whyHtml}
    <div class="body">${para}</div>
    ${sources}
  </div>`;
}

export function buildSignalScanHtml(signals: Signal[]): string {
  if (!signals || signals.length === 0) {
    return '<p class="hint">Signal scan unavailable for this briefing.</p>';
  }
  const active = signals.filter((s) => s.signal === "strong" || s.signal === "light");
  const quiet = signals.filter((s) => s.signal === "none");

  const card = (s: Signal, isQuiet = false): string => {
    const dotCls =
      s.signal === "strong" ? "sig-strong" : s.signal === "light" ? "sig-light" : "sig-none";
    const quietCls = isQuiet ? " sig-quiet" : "";
    const handleHtml = s.handle ? `<span class="sig-handle">${escapeHtml(s.handle)}</span>` : "";
    const badgeHtml = s.source
      ? `<span class="sig-source-badge">${escapeHtml(s.source.toUpperCase())}</span>`
      : "";
    let titleHtml = "";
    if (s.latest_title && s.url) {
      titleHtml = `<a class="sig-title" href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.latest_title)}</a>`;
    } else if (s.latest_title) {
      titleHtml = `<div class="sig-title" style="cursor:default">${escapeHtml(s.latest_title)}</div>`;
    }
    const summaryHtml = s.summary ? `<div class="sig-summary">${escapeHtml(s.summary)}</div>` : "";
    const connHtml = s.connection
      ? `<div class="sig-connection">↳ ${escapeHtml(s.connection)}</div>`
      : "";
    return `
    <div class="sig-card${quietCls}">
      <div class="sig-header">
        <div class="sig-left">
          <div class="sig-dot ${dotCls}"></div>
          <div><span class="sig-name">${escapeHtml(s.name)}</span>${handleHtml}</div>
        </div>
        ${badgeHtml}
      </div>
      ${titleHtml}${summaryHtml}${connHtml}
    </div>`;
  };

  let html = active.map((s) => card(s)).join("");
  if (quiet.length > 0) {
    const qCards = quiet.map((s) => card(s, true)).join("");
    html += `
    <div class="sig-quiet-section">
      <div class="sig-quiet-label">QUIET THIS PERIOD — ${quiet.length} voices</div>
      ${qCards}
    </div>`;
  }
  return html;
}
