import type { Anthropic } from "./anthropic";
import { MODEL_HAIKU } from "./anthropic";
import { PATTERN_PROMPT_BASE } from "./prompts";
import { pythonJsonDumps } from "./python-json";
import { withRetry } from "./retry";
import type { BriefingData, Pattern } from "./types";

// generate_patterns() — Haiku, no web search. The payload is serialized with
// pythonJsonDumps so the prompt matches the Python reference byte-for-byte.
export async function generatePatterns(
  client: Anthropic,
  briefingData: BriefingData
): Promise<Pattern[]> {
  const payload = pythonJsonDumps({
    top_stories: briefingData.top_stories,
    sectors: briefingData.sectors,
  });

  try {
    return await withRetry(async () => {
      const response = await client.messages.create({
        model: MODEL_HAIKU,
        max_tokens: 2500,
        messages: [{ role: "user", content: PATTERN_PROMPT_BASE + payload }],
      });

      const first = response.content[0];
      let raw = first && first.type === "text" ? first.text.trim() : "";
      raw = raw.replace(/^```(?:json)?\s*/, "");
      raw = raw.replace(/\s*```\s*$/, "");
      const patterns = JSON.parse(raw) as Pattern[];
      console.log(`  ✓ ${patterns.length} pattern analyses`);
      return patterns;
    }, "pattern watch");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  Pattern watch failed: ${msg}`);
    return [
      {
        title: "Pattern analysis unavailable",
        subtitle: "Failed to generate — check logs",
        categories: ["Error"],
        content: msg,
      },
    ];
  }
}
