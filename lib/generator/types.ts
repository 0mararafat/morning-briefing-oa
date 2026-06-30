// Shared types for the briefing generator. Mirrors the structures the Python
// reference (morning_dashboard_v4.py) produced and consumed.

export interface Topic {
  name: string;
  description: string;
}

export interface Sources {
  preferred: string[];
  supplementary: string[];
}

export interface Sections {
  top_stories: boolean;
  sector_scan: boolean;
  week_ahead: boolean;
  pattern_watch: boolean;
  deep_dive: boolean;
  signal_scan: boolean;
}

export interface Voice {
  name: string;
  rss: string | null;
  x_handle: string | null;
  search_query?: string | null;
}

export interface Config {
  topics: Topic[];
  sources: Sources;
  sections: Sections;
  signal_scan_frequency: "weekly" | "daily";
  voices: Voice[];
}

// ── Briefing payload (= old briefing-*.json) ────────────────────────────────
export interface StorySource {
  name: string;
  url: string;
}

export interface Story {
  priority: "urgent" | "high" | "tracking";
  headline: string;
  one_liner: string;
  detail: string;
  sector: string;
  sources: StorySource[];
}

export interface Sector {
  name: string;
  has_news: boolean;
  summary: string;
}

export interface WeekEvent {
  day: string;
  event: string;
  tag:
    | "critical"
    | "defense"
    | "space"
    | "data"
    | "earnings"
    | "policy"
    | "tech"
    | "other";
}

export interface BriefingData {
  top_stories: Story[];
  sectors: Sector[];
  week_ahead: WeekEvent[];
}

export interface DeepDive {
  topic: string;
  headline: string;
  standfirst: string;
  body: string;
  why_today: string;
  sources: StorySource[];
}

export interface Pattern {
  title: string;
  subtitle: string;
  categories: string[];
  content: string;
}

export interface Signal {
  name: string;
  handle: string;
  source: string;
  signal: "strong" | "light" | "none";
  latest_title: string;
  url: string;
  summary: string;
  connection: string;
}

// Full assembled briefing (data + generated sections).
export interface Briefing extends BriefingData {
  deep_dive?: DeepDive | null;
  pattern_watch?: Pattern[];
  signal_scan?: Signal[];
}

// ── Mutable per-user state (was wildcard_history.json + signal_scan_cache.json)
export interface WildcardEntry {
  date: string;
  topic: string;
}

export interface SignalCache {
  date: string;
  signals: Signal[];
}

export interface GeneratorState {
  wildcardHistory: WildcardEntry[];
  signalCache: SignalCache | null;
}

// RSS item shape (from fetchRssFeeds).
export interface RssItem {
  title: string;
  url: string;
  published: string;
  summary: string;
}

export type RssContent = Record<string, RssItem[]>;
