import type { Briefing, Config } from "../types";
import {
  buildStoriesHtml,
  buildSectorsHtml,
  buildWeekHtml,
  buildPatternsHtml,
  buildDeepDiveHtml,
  buildSignalScanHtml,
} from "./builders";
import { htmlShell, type Tab } from "./template";

// build_dashboard() — assemble the full standalone HTML document for a briefing.
// Tabs are included per the user's enabled sections.
export function buildDashboardHtml(
  data: Briefing,
  dateStr: string,
  cfg: Config
): string {
  const sections = cfg.sections;
  const tabs: Tab[] = [];

  if (sections.top_stories) {
    tabs.push({ id: "top-stories", label: "Top Stories", html: buildStoriesHtml(data.top_stories ?? []) });
  }
  if (sections.sector_scan) {
    tabs.push({ id: "sector-scan", label: "Sector Scan", html: buildSectorsHtml(data.sectors ?? []) });
  }
  if (sections.week_ahead) {
    tabs.push({ id: "week-ahead", label: "Week Ahead", html: buildWeekHtml(data.week_ahead ?? []) });
  }
  if (sections.pattern_watch) {
    tabs.push({ id: "pattern-watch", label: "Pattern Watch", html: buildPatternsHtml(data.pattern_watch ?? []) });
  }
  if (sections.deep_dive) {
    tabs.push({ id: "deep-dive", label: "Deep Dive", html: buildDeepDiveHtml(data.deep_dive) });
  }
  if (sections.signal_scan) {
    tabs.push({ id: "signal-scan", label: "Signal Scan", html: buildSignalScanHtml(data.signal_scan ?? []) });
  }

  const urgentCount = (data.top_stories ?? []).filter((s) => s.priority === "urgent").length;
  const activeCount = (data.sectors ?? []).filter((s) => s.has_news).length;
  const totalSectors = (data.sectors ?? []).length;

  return htmlShell({ dateStr, urgentCount, activeCount, totalSectors, tabs });
}
