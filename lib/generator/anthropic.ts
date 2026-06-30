import Anthropic from "@anthropic-ai/sdk";

// Model + tool constants — must match morning_dashboard_v4.py exactly.
export const MODEL_SONNET = "claude-sonnet-4-6";
export const MODEL_HAIKU = "claude-haiku-4-5-20251001";

// Server-side web search tool block. Typed loosely because it's an Anthropic
// server tool not in the SDK's static Tool union.
export const WEB_SEARCH_TOOL = {
  type: "web_search_20250305",
  name: "web_search",
} as const;

export function makeClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

// Join all non-empty text blocks (mirrors the Python text_parts collection).
export function joinTextBlocks(content: Anthropic.ContentBlock[]): string {
  return content
    .filter(
      (b): b is Anthropic.TextBlock => b.type === "text" && b.text.trim() !== ""
    )
    .map((b) => b.text)
    .join("\n");
}

export type { Anthropic };
