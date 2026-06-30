import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildSystemPrompt,
  buildFormatInstructions,
  buildDeepDivePrompt,
  buildSignalScanPrompt,
  PATTERN_PROMPT_BASE,
} from "../../lib/generator/prompts";
import { pythonJsonDumps } from "../../lib/generator/python-json";
import type { Config, WildcardEntry, RssContent, BriefingData } from "../../lib/generator/types";

const FIX = join(process.cwd(), "tests", "golden", "fixtures");
const readFix = (name: string) => readFileSync(join(FIX, name), "utf-8");
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf-8"));

const cfg = readJson(join(FIX, "config.json")) as Config;
const history = readJson(join(FIX, "history.json")) as WildcardEntry[];
const rssContent = readJson(join(FIX, "rss-content.json")) as RssContent;
const sample = readJson(join(process.cwd(), "reference", "sample-briefing.json")) as BriefingData;

const TODAY = "Monday, June 29, 2026";
const TODAY_ISO = "2026-06-29";

// Byte-for-byte parity with the Python reference is the quality gate. Any diff
// here means a prompt regression. Regenerate fixtures only on an intentional
// reference change: python3 scripts/gen_golden_fixtures.py
describe("prompt parity (vs Python reference)", () => {
  it("system prompt", () => {
    expect(buildSystemPrompt(cfg)).toBe(readFix("system-prompt.txt"));
  });

  it("format instructions", () => {
    expect(buildFormatInstructions(cfg)).toBe(readFix("format-instructions.txt"));
  });

  it("deep dive prompt (with history)", () => {
    expect(buildDeepDivePrompt(cfg, history)).toBe(readFix("deep-dive-prompt.txt"));
  });

  it("deep dive prompt (empty history)", () => {
    expect(buildDeepDivePrompt(cfg, [])).toBe(readFix("deep-dive-empty.txt"));
  });

  it("pattern prompt (incl. pythonJsonDumps payload parity)", () => {
    const payload = pythonJsonDumps({
      top_stories: sample.top_stories,
      sectors: sample.sectors,
    });
    expect(PATTERN_PROMPT_BASE + payload).toBe(readFix("pattern-prompt.txt"));
  });

  it("signal scan prompt", () => {
    const prompt = buildSignalScanPrompt(
      cfg.voices,
      rssContent,
      { top_stories: sample.top_stories },
      cfg,
      TODAY,
      TODAY_ISO
    );
    expect(prompt).toBe(readFix("signal-scan-prompt.txt"));
  });
});
