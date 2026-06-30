import { z } from "zod";

// Validation for an ingested briefing payload (Claude-routine mode). The core
// three sections are required; the rest are optional. This is the safety net
// against a routine returning a malformed shape.

const SourceSchema = z.object({ name: z.string(), url: z.string() });

export const StorySchema = z.object({
  priority: z.enum(["urgent", "high", "tracking"]),
  headline: z.string(),
  one_liner: z.string().default(""),
  detail: z.string().default(""),
  sector: z.string().default(""),
  sources: z.array(SourceSchema).default([]),
});

export const SectorSchema = z.object({
  name: z.string(),
  has_news: z.boolean().default(false),
  summary: z.string().default(""),
});

export const WeekEventSchema = z.object({
  day: z.string(),
  event: z.string(),
  tag: z
    .enum(["critical", "defense", "space", "data", "earnings", "policy", "tech", "other"])
    .catch("other"),
});

export const DeepDiveSchema = z.object({
  topic: z.string().default(""),
  headline: z.string(),
  standfirst: z.string().default(""),
  body: z.string().default(""),
  why_today: z.string().default(""),
  sources: z.array(SourceSchema).default([]),
});

export const PatternSchema = z.object({
  title: z.string(),
  subtitle: z.string().default(""),
  categories: z.array(z.string()).default([]),
  content: z.string().default(""),
});

export const SignalSchema = z.object({
  name: z.string(),
  handle: z.string().default(""),
  source: z.string().default(""),
  signal: z.enum(["strong", "light", "none"]).catch("none"),
  latest_title: z.string().default(""),
  url: z.string().default(""),
  summary: z.string().default(""),
  connection: z.string().default(""),
});

export const IngestedBriefingSchema = z.object({
  top_stories: z.array(StorySchema),
  sectors: z.array(SectorSchema),
  week_ahead: z.array(WeekEventSchema),
  deep_dive: DeepDiveSchema.nullish(),
  pattern_watch: z.array(PatternSchema).optional(),
  signal_scan: z.array(SignalSchema).optional(),
});

export type IngestedBriefing = z.infer<typeof IngestedBriefingSchema>;
