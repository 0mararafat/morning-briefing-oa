// Self-contained HTML document shell for a stored briefing (used for stored
// Briefing.html and public share links). Tokens are inlined so the page renders
// standalone, independent of the app's globals.css. The Claude Design system
// (M0.5) refines these styles; the in-app React viewer mirrors the same look.

import { escapeHtml } from "./builders";

export interface Tab {
  id: string;
  label: string;
  html: string;
}

export interface ShellInput {
  dateStr: string;
  urgentCount: number;
  activeCount: number;
  totalSectors: number;
  tabs: Tab[];
}

const STYLES = `
:root{--bg:#ffffff;--surface:#fff;--ink:#15171b;--muted:#565b64;--border:rgba(18,22,28,0.12);--accent:#00497f;
--urgent:#dc2626;--high:#bd7f0e;--tracking:#8b909a;--sig-strong:#0e8a4f;--sig-light:#bd7f0e;--sig-none:#bcc1c9;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Spectral,Georgia,serif;line-height:1.55}
a{color:var(--accent)}
.wrap{max-width:840px;margin:0 auto;padding:28px 20px 80px}
.masthead{border-bottom:2px solid var(--ink);padding-bottom:14px;margin-bottom:18px}
.masthead h1{font-family:Spectral,Georgia,serif;font-size:34px;margin:0 0 4px}
.masthead .date{color:var(--muted);font-size:14px}
.stats{display:flex;gap:18px;margin-top:10px;font-size:13px;color:var(--muted)}
.stats b{color:var(--ink)}
.tabs{display:flex;flex-wrap:wrap;gap:6px;margin:18px 0 22px;position:sticky;top:0;background:var(--bg);padding:8px 0;z-index:5}
.tab{border:1px solid var(--border);background:var(--surface);color:var(--muted);padding:7px 13px;border-radius:999px;
font-size:13px;font-weight:600;cursor:pointer}
.tab.active{background:var(--ink);color:#fff;border-color:var(--ink)}
.panel{display:none}
.panel.active{display:block}
h3{font-family:Spectral,Georgia,serif;font-size:20px;margin:4px 0}
.hint{color:var(--muted);font-style:italic}
/* cards */
.story,.pattern{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:12px;cursor:pointer}
.card-top{display:flex;gap:12px;align-items:flex-start}
.story-dot{width:10px;height:10px;border-radius:50%;margin-top:7px;flex:none}
.dot-urgent{background:var(--urgent)}.dot-high{background:var(--high)}.dot-tracking{background:var(--tracking)}
.story-content{flex:1}
.story-meta{display:flex;gap:10px;align-items:center;margin-bottom:4px}
.priority-tag{font-size:11px;font-weight:700;padding:2px 7px;border-radius:5px;color:#fff;letter-spacing:.04em}
.tag-urgent{background:var(--urgent)}.tag-high{background:var(--high)}.tag-tracking{background:var(--tracking)}
.sector-label{font-size:12px;color:var(--muted)}
.one-liner{color:var(--muted);font-size:14px}
.chevron{color:var(--muted);transition:transform .2s}
.open .chevron{transform:rotate(180deg)}
.card-detail{max-height:0;overflow:hidden;transition:max-height .25s ease}
.open .card-detail{max-height:4000px}
.card-detail-inner{padding-top:12px}
.card-detail-inner p{margin:0 0 10px}
/* sources */
.story-sources,.deep-dive-sources{margin-top:12px;font-size:13px}
.sources-label{font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.06em;margin-right:8px}
.source-sep{margin:0 7px;color:var(--border)}
/* sectors */
.sector-item{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:8px}
.sector-top{display:flex;gap:9px;align-items:center}
.sector-dot{width:9px;height:9px;border-radius:50%}
.sector-dot.active{background:var(--sig-strong)}.sector-dot.quiet{background:var(--sig-none)}
.sector-name{font-weight:600}
.sector-summary{color:var(--muted);font-size:14px;margin-top:6px;padding-left:18px}
/* week */
.week-item{display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)}
.week-item.critical{font-weight:600}
.week-day{font-family:"IBM Plex Mono",monospace;font-size:13px;width:54px;flex:none;color:var(--muted)}
.week-event{flex:1}
.week-tag{font-size:11px;padding:2px 8px;border-radius:5px;text-transform:capitalize}
/* patterns */
.pattern{background:#211e17;color:#f2ede2;border-color:#33302a}
.pattern h3{color:#fff}
.pattern-label{font-size:11px;letter-spacing:.08em;color:#d9b160;font-weight:700}
.subtitle{color:#b8b3aa;font-size:14px;margin:2px 0 6px}
.pattern-cat{display:inline-block;font-size:11px;background:#33302a;color:#d8d2c6;padding:2px 8px;border-radius:5px;margin-right:6px}
/* deep dive */
.deep-dive{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px}
.deep-dive-kicker{font-size:12px;font-weight:700;letter-spacing:.06em;color:var(--accent);display:flex;align-items:center;gap:7px}
.deep-dive-kicker-dot{width:8px;height:8px;border-radius:50%;background:var(--accent)}
.deep-dive h2{font-family:Spectral,Georgia,serif;font-size:28px;margin:10px 0 6px}
.standfirst{font-size:17px;color:var(--muted);margin-bottom:14px}
.deep-dive-why{font-size:13px;color:var(--accent);margin-bottom:14px}
.deep-dive .body p{margin:0 0 12px}
/* signal */
.sig-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px}
.sig-card.sig-quiet{opacity:.6}
.sig-header{display:flex;justify-content:space-between;align-items:center}
.sig-left{display:flex;gap:9px;align-items:center}
.sig-dot{width:9px;height:9px;border-radius:50%}
.sig-strong{background:var(--sig-strong)}.sig-light{background:var(--sig-light)}.sig-none{background:var(--sig-none)}
.sig-name{font-weight:600}
.sig-handle{color:var(--muted);font-size:13px;margin-left:7px}
.sig-source-badge{font-size:10px;font-weight:700;color:var(--muted);border:1px solid var(--border);padding:2px 6px;border-radius:5px}
.sig-title{display:block;margin-top:8px;font-weight:600}
.sig-summary{color:var(--muted);font-size:14px;margin-top:5px}
.sig-connection{color:var(--accent);font-size:13px;margin-top:6px}
.sig-quiet-section{margin-top:16px}
.sig-quiet-label{font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--muted);margin-bottom:8px}
`;

const SCRIPT = `
function toggleCard(el){el.classList.toggle('open');}
function showTab(id){
  document.querySelectorAll('.panel').forEach(function(p){p.classList.toggle('active',p.id===id);});
  document.querySelectorAll('.tab').forEach(function(t){t.classList.toggle('active',t.dataset.tab===id);});
}
`;

export function htmlShell(input: ShellInput): string {
  const { dateStr, urgentCount, activeCount, totalSectors, tabs } = input;
  const nav = tabs
    .map(
      (t, i) =>
        `<button class="tab${i === 0 ? " active" : ""}" data-tab="${t.id}" onclick="showTab('${t.id}')">${escapeHtml(t.label)}</button>`
    )
    .join("");
  const panels = tabs
    .map(
      (t, i) => `<section class="panel${i === 0 ? " active" : ""}" id="${t.id}">${t.html}</section>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Morning Briefing — ${escapeHtml(dateStr)}</title>
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>${STYLES}</style>
</head>
<body>
<div class="wrap">
  <header class="masthead">
    <h1>Morning Briefing</h1>
    <div class="date">${escapeHtml(dateStr)}</div>
    <div class="stats">
      <span><b>${urgentCount}</b> urgent</span>
      <span><b>${activeCount}</b>/${totalSectors} sectors active</span>
    </div>
  </header>
  <nav class="tabs">${nav}</nav>
  ${panels}
</div>
<script>${SCRIPT}</script>
</body>
</html>`;
}
