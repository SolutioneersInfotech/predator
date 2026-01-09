import OpenAI from "openai";
import { getCacheValue, setCacheValue } from "../utils/ttlCache.js";

type NewsItem = {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  summary: string;
  sentiment: "positive" | "negative" | "neutral";
  impact: "high" | "medium" | "low";
};

export type NewsSummary = {
  symbol: string;
  asOf: string;
  items: NewsItem[];
  overallSentiment: "positive" | "negative" | "neutral";
  keyThemes: string[];
  watchlist: string[];
  warning?: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;

function buildFallback(symbol: string, warning?: string): NewsSummary {
  return {
    symbol,
    asOf: new Date().toISOString(),
    items: [],
    overallSentiment: "neutral",
    keyThemes: [],
    watchlist: [],
    ...(warning ? { warning } : {}),
  };
}

function safeParseJson(payload: string): Record<string, unknown> | null {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function getNewsSummary(
  symbol: string,
  timeWindowHours = 48,
  maxItems = 10
): Promise<NewsSummary> {
  const cacheKey = `news:${symbol}:${timeWindowHours}:${maxItems}`;
  const cached = getCacheValue<NewsSummary>(cacheKey);
  if (cached) {
    return cached;
  }

  if (!process.env.OPENAI_API_KEY) {
    const fallback = buildFallback(symbol, "OPENAI_API_KEY not configured.");
    setCacheValue(cacheKey, fallback, CACHE_TTL_MS);
    return fallback;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-5.2";

  try {
    const response = await client.responses.create({
      model,
      tools: [{ type: "web_search" }],
      temperature: 0.2,
      input: [
        {
          role: "system",
          content:
            "You are a market news analyst. Respond ONLY with valid JSON. Do not include markdown.",
        },
        {
          role: "user",
          content: [
            `Find the latest news about ${symbol} within the last ${timeWindowHours} hours.`,
            "Summarize into JSON with keys:",
            "{ items: [{ title, source, publishedAt, url, summary, sentiment, impact }], overallSentiment, keyThemes, watchlist }.",
            `Limit to ${maxItems} items. Sentiment values: positive|negative|neutral. Impact: high|medium|low.`,
          ].join(" "),
        },
      ],
    });

    const text = response.output_text?.trim() ?? "";
    const parsed = safeParseJson(text);
    if (!parsed) {
      const fallback = buildFallback(symbol, "Failed to parse OpenAI response.");
      setCacheValue(cacheKey, fallback, CACHE_TTL_MS);
      return fallback;
    }

    const items = Array.isArray(parsed.items) ? parsed.items.slice(0, maxItems) : [];
    const summary: NewsSummary = {
      symbol,
      asOf: new Date().toISOString(),
      items: items as NewsItem[],
      overallSentiment: (parsed.overallSentiment as NewsSummary["overallSentiment"]) ?? "neutral",
      keyThemes: Array.isArray(parsed.keyThemes) ? (parsed.keyThemes as string[]) : [],
      watchlist: Array.isArray(parsed.watchlist) ? (parsed.watchlist as string[]) : [],
    };

    setCacheValue(cacheKey, summary, CACHE_TTL_MS);
    return summary;
  } catch (error: any) {
    console.error("OpenAI news error:", error?.message ?? error);
    const fallback = buildFallback(symbol, "OpenAI request failed.");
    setCacheValue(cacheKey, fallback, CACHE_TTL_MS);
    return fallback;
  }
}
