import OpenAI from "openai";
import { getCacheValue, setCacheValue } from "../utils/cache.js";

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
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
  };
  overallSentiment: "positive" | "negative" | "neutral";
  keyThemes: string[];
  watchlist: string[];
  warning?: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;

function buildFallback(symbol: string, page: number, pageSize: number, warning?: string): NewsSummary {
  return {
    symbol,
    asOf: new Date().toISOString(),
    items: [],
    pagination: {
      page,
      pageSize,
      totalPages: 1,
      hasMore: false,
    },
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

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function toDateMillis(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export async function getNewsSummary(
  symbol: string,
  {
    timeWindowHours = 48,
    page = 1,
    limit = 8,
  }: { timeWindowHours?: number; page?: number; limit?: number } = {}
): Promise<NewsSummary> {
  const sanitizedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const sanitizedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 8;
  const requestCount = sanitizedPage * sanitizedLimit + 1;
  const cacheKey = `news:${symbol}:${timeWindowHours}:${sanitizedPage}:${sanitizedLimit}`;
  const cached = getCacheValue<NewsSummary>(cacheKey);
  if (cached) {
    return cached;
  }

  if (!process.env.OPENAI_API_KEY) {
    const fallback = buildFallback(
      symbol,
      sanitizedPage,
      sanitizedLimit,
      "OPENAI_API_KEY not configured."
    );
    setCacheValue(cacheKey, fallback, CACHE_TTL_MS);
    return fallback;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-5.2";

  try {
    const response = await client.responses.create({
      model,
      tools: [{ type: "web_search_preview" }],
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
            `Find the latest commodity-related news about ${symbol} within the last ${timeWindowHours} hours.`,
            "Summarize into JSON with keys:",
            "{ items: [{ title, source, publishedAt, url, summary, sentiment, impact }], overallSentiment, keyThemes, watchlist }.",
            "Provide valid URLs to full stories.",
            `Limit to ${requestCount} items. Sentiment values: positive|negative|neutral. Impact: high|medium|low.`,
          ].join(" "),
        },
      ],
    });

    const text = response.output_text?.trim() ?? "";
    const parsed = safeParseJson(text);
    if (!parsed) {
      const fallback = buildFallback(
        symbol,
        sanitizedPage,
        sanitizedLimit,
        "Failed to parse OpenAI response."
      );
      setCacheValue(cacheKey, fallback, CACHE_TTL_MS);
      return fallback;
    }

    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
    const normalizedItems = rawItems
      .filter((item): item is NewsItem => {
        return (
          typeof item === "object" &&
          item !== null &&
          typeof (item as NewsItem).title === "string" &&
          typeof (item as NewsItem).source === "string" &&
          typeof (item as NewsItem).publishedAt === "string" &&
          typeof (item as NewsItem).url === "string" &&
          typeof (item as NewsItem).summary === "string" &&
          ["positive", "negative", "neutral"].includes((item as NewsItem).sentiment) &&
          ["high", "medium", "low"].includes((item as NewsItem).impact)
        );
      })
      .filter((item) => isValidUrl(item.url))
      .sort((a, b) => toDateMillis(b.publishedAt) - toDateMillis(a.publishedAt));

    const pageStart = (sanitizedPage - 1) * sanitizedLimit;
    const pageItems = normalizedItems.slice(pageStart, pageStart + sanitizedLimit);
    const hasMore = normalizedItems.length > pageStart + sanitizedLimit;
    const totalPages = hasMore
      ? sanitizedPage + 1
      : Math.max(1, Math.ceil(normalizedItems.length / sanitizedLimit));
    const summary: NewsSummary = {
      symbol,
      asOf: new Date().toISOString(),
      items: pageItems,
      pagination: {
        page: sanitizedPage,
        pageSize: sanitizedLimit,
        totalPages,
        hasMore,
      },
      overallSentiment: (parsed.overallSentiment as NewsSummary["overallSentiment"]) ?? "neutral",
      keyThemes: Array.isArray(parsed.keyThemes) ? (parsed.keyThemes as string[]) : [],
      watchlist: Array.isArray(parsed.watchlist) ? (parsed.watchlist as string[]) : [],
    };

    setCacheValue(cacheKey, summary, CACHE_TTL_MS);
    return summary;
  } catch (error: any) {
    console.error("OpenAI news error:", error?.message ?? error);
    const fallback = buildFallback(
      symbol,
      sanitizedPage,
      sanitizedLimit,
      "OpenAI request failed."
    );
    setCacheValue(cacheKey, fallback, CACHE_TTL_MS);
    return fallback;
  }
}
