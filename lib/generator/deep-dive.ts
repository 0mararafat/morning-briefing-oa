import type { Anthropic } from "./anthropic";
import { MODEL_SONNET, WEB_SEARCH_TOOL, joinTextBlocks } from "./anthropic";
import { buildDeepDivePrompt } from "./prompts";
import { extractJson } from "./extract-json";
import { withRetry } from "./retry";
import type { Config, DeepDive, WildcardEntry } from "./types";

// generate_deep_dive() — rotating long-form Sonnet + web-search call.
// Returns the deep dive plus the topic label to append to wildcard history,
// or null if it fails after all retries (matches the Python try/except).
export async function generateDeepDive(
  client: Anthropic,
  cfg: Config,
  history: WildcardEntry[],
  todayHuman: string
): Promise<{ data: DeepDive; topic: string } | null> {
  const prompt = buildDeepDivePrompt(cfg, history) + `\n\nToday is ${todayHuman}.`;

  try {
    return await withRetry(async () => {
      const response = await client.messages.create({
        model: MODEL_SONNET,
        max_tokens: 3000,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [WEB_SEARCH_TOOL as any],
        messages: [{ role: "user", content: prompt }],
      });

      const data = extractJson(joinTextBlocks(response.content)) as DeepDive | null;
      if (data === null || !("headline" in data)) {
        throw new Error("Deep dive returned no valid JSON with 'headline' key");
      }

      const topic = data.topic || data.headline;
      console.log(`  ✓ Deep dive: ${topic}`);
      return { data, topic };
    }, "deep dive");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  Deep dive failed after all retries: ${msg}`);
    return null;
  }
}
