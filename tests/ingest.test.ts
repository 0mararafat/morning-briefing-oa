import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { IngestedBriefingSchema } from "../lib/generator/briefing-schema";
import { generateToken, hashToken } from "../lib/tokens";

const sample = JSON.parse(
  readFileSync(join(process.cwd(), "reference", "sample-briefing.json"), "utf-8")
);

describe("ingest payload validation", () => {
  it("accepts a real briefing payload", () => {
    const parsed = IngestedBriefingSchema.parse(sample);
    expect(Array.isArray(parsed.top_stories)).toBe(true);
    expect(Array.isArray(parsed.sectors)).toBe(true);
  });

  it("rejects a payload missing top_stories", () => {
    expect(() => IngestedBriefingSchema.parse({ sectors: [], week_ahead: [] })).toThrow();
  });

  it("coerces an unknown week tag to 'other'", () => {
    const parsed = IngestedBriefingSchema.parse({
      top_stories: [],
      sectors: [],
      week_ahead: [{ day: "Mon 1", event: "x", tag: "bogus" }],
    });
    expect(parsed.week_ahead[0].tag).toBe("other");
  });

  it("treats deep_dive / pattern_watch / signal_scan as optional", () => {
    const parsed = IngestedBriefingSchema.parse({
      top_stories: [],
      sectors: [],
      week_ahead: [],
    });
    expect(parsed.deep_dive ?? null).toBeNull();
  });
});

describe("ingest tokens", () => {
  it("hashes deterministically", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("generates url-safe tokens of useful length", () => {
    const t = generateToken();
    expect(t.length).toBeGreaterThanOrEqual(40);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
