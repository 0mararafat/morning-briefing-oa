import Parser from "rss-parser";
import { DateTime } from "luxon";
import type { RssContent, RssItem, Voice } from "./types";

// fetch_rss_feeds() — pull recent items per voice. Keeps items with no date or
// newer than a 7-day cutoff, first 5 entries, HTML stripped, summary capped at
// 400 chars. RSS is live/external so this is not part of the golden parity set.
export async function fetchRssFeeds(voices: Voice[]): Promise<RssContent> {
  const cutoff = DateTime.utc().minus({ days: 7 });
  const parser = new Parser({
    timeout: 15000,
    headers: { "User-Agent": "MorningBriefing/1.0" },
  });

  const results: RssContent = {};

  for (const voice of voices) {
    const name = voice.name;
    const rssUrl = voice.rss;
    if (!rssUrl) {
      results[name] = [];
      continue;
    }
    try {
      const feed = await parser.parseURL(rssUrl);
      const items: RssItem[] = [];
      for (const entry of feed.items.slice(0, 5)) {
        const dateStr = entry.isoDate ?? entry.pubDate ?? null;
        let pub: DateTime | null = null;
        if (dateStr) {
          const parsed = DateTime.fromJSDate(new Date(dateStr)).toUTC();
          pub = parsed.isValid ? parsed : null;
        }

        if (pub === null || pub > cutoff) {
          const rawSummary =
            (entry.summary as string | undefined) ??
            (entry.content as string | undefined) ??
            (entry.contentSnippet as string | undefined) ??
            "";
          const summary = rawSummary
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 400);
          items.push({
            title: (entry.title ?? "").trim(),
            url: (entry.link ?? "").trim(),
            published: pub ? pub.toFormat("yyyy-MM-dd") : "",
            summary,
          });
        }
      }
      results[name] = items;
      if (items.length > 0) {
        console.log(`    ${name}: ${items.length} RSS item(s)`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`    RSS fetch failed for ${name}: ${msg}`);
      results[name] = [];
    }
  }

  return results;
}
