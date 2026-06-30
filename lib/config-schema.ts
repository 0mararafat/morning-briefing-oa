import { z } from "zod";

// Single source of truth for the user config shape. Replaces the YAML backfill
// in the Python reference; DEFAULT_CONFIG seeds the wizard for new users.

export const TopicSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
});

export const SourcesSchema = z.object({
  preferred: z.array(z.string()).default([]),
  supplementary: z.array(z.string()).default([]),
});

export const SectionsSchema = z.object({
  top_stories: z.boolean(),
  sector_scan: z.boolean(),
  week_ahead: z.boolean(),
  pattern_watch: z.boolean(),
  deep_dive: z.boolean(),
  signal_scan: z.boolean(),
});

export const VoiceSchema = z.object({
  name: z.string().min(1),
  rss: z.string().nullable().default(null),
  x_handle: z.string().nullable().default(null),
  search_query: z.string().nullable().optional(),
});

// The payload the wizard PUTs to /api/config. Schedule is collected as a local
// time + timezone + day list; the API converts time+days into a 5-field cron
// (interpreted in `timezone` by the scheduler — no UTC conversion needed).
export const ConfigInputSchema = z.object({
  topics: z.array(TopicSchema).min(1),
  sources: SourcesSchema,
  sections: SectionsSchema,
  voices: z.array(VoiceSchema),
  signalScanFrequency: z.enum(["weekly", "daily"]),
  time: z.string().regex(/^\d{2}:\d{2}$/), // "HH:MM" local
  timezone: z.string().min(1),
  days: z.array(z.number().int().min(0).max(6)).min(1), // 0=Sun .. 6=Sat
  mode: z.enum(["API_KEY", "CLAUDE_ROUTINE"]),
});

export type ConfigInput = z.infer<typeof ConfigInputSchema>;
export type ConfigSections = z.infer<typeof SectionsSchema>;

// ── Default config (ported from DEFAULT_CONFIG in morning_dashboard_v4.py) ───
export const DEFAULT_TOPICS = [
  { name: "Frontier Tech / AI", description: "AI, quantum computing, semiconductors/GPU supply chain, compute infrastructure, photonics, bio/biotech, space/launch, robotics" },
  { name: "Applied Tech & Industry", description: "Big Tech strategy, startups & VC, enterprise AI adoption, major M&A/funding/IPOs/earnings, platform shifts, talent signals" },
  { name: "US Policy & Power", description: "Tech regulation, fiscal/monetary, defense & industrial policy, White House & Congress, budget, judicial decisions, elections, science policy" },
  { name: "AI Regulation & Governance", description: "US executive orders, EU AI Act, global frameworks, industry self-regulation, safety institutes" },
  { name: "Geopolitics", description: "US-China, Middle East, India, UK/EU, Latin America, Africa" },
  { name: "China", description: "Tech decoupling, economic health, Taiwan, industrial overcapacity" },
  { name: "Markets", description: "Equities, rates/Fed, VC, commodities, central banks, inflation, bonds, currencies" },
  { name: "Digital Finance", description: "Crypto regulation, CBDCs, stablecoins, DeFi" },
  { name: "Energy", description: "Oil & gas, nuclear/renewables, AI infrastructure, grid" },
  { name: "Defense & Security", description: "Conflicts, military tech, cyber, intelligence" },
  { name: "Labor & Workforce", description: "AI displacement, immigration/talent, unions, remote work" },
];

export const DEFAULT_SOURCES = {
  preferred: [
    "Financial Times",
    "Wall Street Journal",
    "Semafor",
    "Reuters",
    "Al Jazeera",
    "AP",
    "The Economist",
    "The Atlantic",
  ],
  supplementary: ["Ars Technica", "TechCrunch", "Defense One"],
};

export const PRESET_SOURCES = [
  "Financial Times", "Wall Street Journal", "The Economist", "Reuters", "AP",
  "Semafor", "The Atlantic", "Al Jazeera", "Bloomberg", "BBC", "New York Times",
  "The Guardian", "Axios", "Politico", "Wired", "MIT Technology Review",
  "Ars Technica", "TechCrunch", "Defense One", "Nature",
];

export const DEFAULT_SECTIONS = {
  top_stories: true,
  sector_scan: true,
  week_ahead: true,
  pattern_watch: true,
  deep_dive: true,
  signal_scan: true,
};

export const DEFAULT_VOICES = [
  { name: "Leopold Aschenbrenner", rss: "https://situational.substack.com/feed", x_handle: "leopoldasch" },
  { name: "Dan Wang", rss: "https://danwwang.substack.com/feed", x_handle: "dkwang" },
  { name: "Nathan Benaich", rss: "https://nathanbenaich.substack.com/feed", x_handle: "nathanbenaich" },
  { name: "Stanley Druckenmiller", rss: null, x_handle: null, search_query: "Stanley Druckenmiller interview remarks site:cnbc.com OR site:bloomberg.com OR site:ft.com" },
  { name: "Byrne Hobart", rss: "https://thediff.co/feed", x_handle: "byrnehobart" },
  { name: "Michael Burry", rss: null, x_handle: "michaeljburry" },
  { name: "Ben Thompson", rss: "https://stratechery.com/feed/", x_handle: "stratechery" },
  { name: "Paul Graham", rss: "https://www.aaronsw.com/2002/feeds/pgessays.rss", x_handle: "paulg" },
  { name: "Benedict Evans", rss: "https://www.ben-evans.com/benedictevans/rss.xml", x_handle: "benedictevans" },
  { name: "Packy McCormick", rss: "https://www.notboring.co/feed", x_handle: "packym" },
  { name: "CJ Gustafson", rss: "https://www.mostlymetrics.com/feed", x_handle: "cjgus" },
  { name: "Lenny Rachitsky", rss: "https://www.lennysnewsletter.com/feed", x_handle: "lennysan" },
  { name: "Andrej Karpathy", rss: "https://karpathy.github.io/feed.xml", x_handle: "karpathy" },
  { name: "Ilya Sutskever", rss: null, x_handle: "ilyasut" },
  { name: "Noam Brown", rss: null, x_handle: "noambrown" },
  { name: "François Chollet", rss: null, x_handle: "fchollet" },
];

export const DEFAULT_CONFIG_INPUT: ConfigInput = {
  topics: DEFAULT_TOPICS,
  sources: DEFAULT_SOURCES,
  sections: DEFAULT_SECTIONS,
  voices: DEFAULT_VOICES,
  signalScanFrequency: "weekly",
  time: "05:30",
  timezone: "Europe/London",
  days: [1, 2, 3, 4, 5],
  mode: "API_KEY",
};
