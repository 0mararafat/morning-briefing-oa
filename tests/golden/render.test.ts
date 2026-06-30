import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDashboardHtml } from "../../lib/generator/render/render";
import type { Briefing, Config } from "../../lib/generator/types";

const FIX = join(process.cwd(), "tests", "golden", "fixtures");
const cfg = JSON.parse(readFileSync(join(FIX, "config.json"), "utf-8")) as Config;
const sample = JSON.parse(
  readFileSync(join(process.cwd(), "reference", "sample-briefing.json"), "utf-8")
) as Briefing;

// Regression snapshot of our OWN renderer (not Python parity — the UI is
// redesigned via Claude Design). Re-baseline with `vitest -u` on intentional
// design changes.
describe("buildDashboardHtml", () => {
  it("renders a stable, well-formed document", () => {
    const html = buildDashboardHtml(sample, "Monday, June 29, 2026", cfg);
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("Morning Briefing");
    expect(html).toContain("Monday, June 29, 2026");
    expect(html).toMatchSnapshot();
  });

  it("escapes HTML in content", () => {
    const evil: Briefing = {
      top_stories: [
        {
          priority: "urgent",
          headline: "<script>alert(1)</script>",
          one_liner: "x & y < z",
          detail: "para one\n\npara two",
          sector: "Test",
          sources: [{ name: "A&B", url: "https://x.test/?a=1&b=2" }],
        },
      ],
      sectors: [],
      week_ahead: [],
    };
    const html = buildDashboardHtml(evil, "Day", cfg);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
