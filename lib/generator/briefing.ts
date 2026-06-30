import type { Anthropic } from "./anthropic";
import { MODEL_SONNET, WEB_SEARCH_TOOL, joinTextBlocks } from "./anthropic";
import { buildSystemPrompt, buildFormatInstructions } from "./prompts";
import { extractJson } from "./extract-json";
import { withRetry } from "./retry";
import type { BriefingData, Config } from "./types";

// generate_briefing_data() — main Sonnet + web-search call.
export async function generateBriefingData(
  client: Anthropic,
  cfg: Config,
  todayHuman: string
): Promise<BriefingData> {
  const system = buildSystemPrompt(cfg) + "\n\n" + buildFormatInstructions(cfg);

  return withRetry(async () => {
    const response = await client.messages.create({
      model: MODEL_SONNET,
      max_tokens: 8000,
      system,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [WEB_SEARCH_TOOL as any],
      messages: [{ role: "user", content: `Go. Today is ${todayHuman}.` }],
    });

    const fullText = joinTextBlocks(response.content);
    if (!fullText.trim()) {
      throw new Error("Empty response from API");
    }

    const data = extractJson(fullText) as BriefingData | null;
    if (data === null) {
      throw new Error("No valid JSON found in main briefing response");
    }

    const missing = (["top_stories", "sectors", "week_ahead"] as const).filter(
      (k) => !(k in data)
    );
    if (missing.length > 0) {
      throw new Error(`Missing keys in response: ${missing.join(", ")}`);
    }

    console.log(
      `  ✓ ${data.top_stories.length} stories, ${data.sectors.length} sectors, ${data.week_ahead.length} events`
    );
    return data;
  }, "main briefing");
}
