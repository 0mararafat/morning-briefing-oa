import type { Anthropic } from "./anthropic";
import { MODEL_SONNET, WEB_SEARCH_TOOL, joinTextBlocks } from "./anthropic";
import { buildSignalScanPrompt } from "./prompts";
import { extractJson } from "./extract-json";
import { withRetry } from "./retry";
import type { BriefingData, Config, RssContent, Signal, Voice } from "./types";

// generate_signal_scan() — Sonnet + web search. Returns [] on failure (matches
// the Python try/except).
export async function generateSignalScan(
  client: Anthropic,
  voices: Voice[],
  rssContent: RssContent,
  briefingData: BriefingData,
  cfg: Config,
  todayHuman: string,
  todayIso: string
): Promise<Signal[]> {
  const prompt = buildSignalScanPrompt(
    voices,
    rssContent,
    briefingData,
    cfg,
    todayHuman,
    todayIso
  );

  try {
    return await withRetry(async () => {
      const response = await client.messages.create({
        model: MODEL_SONNET,
        max_tokens: 6000,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [WEB_SEARCH_TOOL as any],
        messages: [{ role: "user", content: prompt }],
      });

      const fullText = joinTextBlocks(response.content);
      const data = extractJson(fullText);
      if (data === null || !Array.isArray(data)) {
        console.log(`  Raw response tail: ${fullText.slice(-300)}`);
        throw new Error("Signal scan returned no valid JSON array");
      }
      const signals = data as Signal[];
      const active = signals.filter(
        (s) => s.signal === "strong" || s.signal === "light"
      ).length;
      console.log(`  ✓ ${signals.length} voices scanned, ${active} with recent signal`);
      return signals;
    }, "signal scan");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  Signal scan failed: ${msg}`);
    return [];
  }
}
