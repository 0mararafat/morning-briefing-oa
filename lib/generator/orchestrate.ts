import { DateTime } from "luxon";
import type { Anthropic } from "./anthropic";
import { generateBriefingData } from "./briefing";
import { generateDeepDive } from "./deep-dive";
import { generatePatterns } from "./patterns";
import { generateSignalScan } from "./signal-scan";
import { fetchRssFeeds } from "./rss";
import { buildDashboardHtml } from "./render/render";
import type {
  Briefing,
  Config,
  GeneratorState,
  RssContent,
  Signal,
  SignalCache,
} from "./types";

// Briefing generation pipeline — orchestrates the per-section generators
// (briefing, deep dive, patterns, signal scan) into a single edition. Transport-
// agnostic: a pure function of (config, state, today) returning the briefing data,
// rendered HTML, and updated state. No file or DB access.
export interface RunBriefingInput {
  config: Config;
  state: GeneratorState;
  anthropic: Anthropic;
  today: { human: string; iso: string };
  force?: boolean;
}

export interface RunBriefingResult {
  data: Briefing;
  html: string;
  newState: GeneratorState;
}

function cacheAgeDays(cacheDateIso: string, todayIso: string): number {
  const a = DateTime.fromISO(todayIso);
  const b = DateTime.fromISO(cacheDateIso);
  return Math.floor(a.diff(b, "days").days);
}

// runBriefing — 3-stage pipeline matching morning_dashboard_v4.py's main(),
// but transport-agnostic: takes state in, returns the briefing + rendered HTML
// + the updated state. No file or DB access.
export async function runBriefing(input: RunBriefingInput): Promise<RunBriefingResult> {
  const { config, state, anthropic, today, force = false } = input;
  const sections = config.sections;

  // ── Stage 1 (parallel): main briefing + deep dive + RSS fetch ──────────────
  const [briefingData, deepDiveResult, rssContent] = await Promise.all([
    generateBriefingData(anthropic, config, today.human),
    sections.deep_dive
      ? generateDeepDive(anthropic, config, state.wildcardHistory, today.human)
      : Promise.resolve(null),
    sections.signal_scan
      ? fetchRssFeeds(config.voices)
      : Promise.resolve({} as RssContent),
  ]);

  // ── Stage 2 (parallel): signal scan (with weekly cache) + patterns ─────────
  let newSignalCache: SignalCache | null = state.signalCache;

  const signalTask = async (): Promise<Signal[]> => {
    if (!sections.signal_scan) return [];
    const weekly = config.signal_scan_frequency === "weekly";
    const useCache =
      weekly &&
      !force &&
      state.signalCache != null &&
      cacheAgeDays(state.signalCache.date, today.iso) < 7;

    if (useCache && state.signalCache) {
      console.log(`  Using cached signal scan from ${state.signalCache.date}`);
      return state.signalCache.signals;
    }

    const signals = await generateSignalScan(
      anthropic,
      config.voices,
      rssContent,
      briefingData,
      config,
      today.human,
      today.iso
    );
    if (weekly) newSignalCache = { date: today.iso, signals };
    return signals;
  };

  const patternTask = async () =>
    sections.pattern_watch ? generatePatterns(anthropic, briefingData) : [];

  const [signals, patterns] = await Promise.all([signalTask(), patternTask()]);

  // ── Assemble ────────────────────────────────────────────────────────────────
  const data: Briefing = {
    ...briefingData,
    deep_dive: deepDiveResult?.data ?? null,
    pattern_watch: patterns,
    signal_scan: signals,
  };

  const html = buildDashboardHtml(data, today.human, config);

  // ── Updated state ─────────────────────────────────────────────────────────
  const wildcardHistory = deepDiveResult
    ? [...state.wildcardHistory, { date: today.iso, topic: deepDiveResult.topic }].slice(-30)
    : state.wildcardHistory;

  return {
    data,
    html,
    newState: { wildcardHistory, signalCache: newSignalCache },
  };
}
