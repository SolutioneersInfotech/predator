import fetch, { type Response } from "node-fetch";
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

  if (!process.env.GEMINI_API_KEY) {
    const fallback = buildFallback(
      symbol,
      sanitizedPage,
      sanitizedLimit,
      "GEMINI_API_KEY not configured."
    );
    setCacheValue(cacheKey, fallback, CACHE_TTL_MS);
    return fallback;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const normalizedModel = process.env.GEMINI_MODEL?.replace(/^models\//, "").trim();
  const deprecatedModels = new Set(["gemini-pro", "text-bison", "chat-bison", "text-bison-001"]);
  const requestedModel =
    normalizedModel && !deprecatedModels.has(normalizedModel) ? normalizedModel : undefined;
  const defaultModel = requestedModel ?? "gemini-flash-latest";
  const apiVersionOverride = process.env.GEMINI_API_VERSION?.trim();
  const apiVersions = apiVersionOverride ? [apiVersionOverride] : ["v1beta", "v1"];
  const enableSearch = process.env.GEMINI_ENABLE_SEARCH?.toLowerCase() === "true";

  if (normalizedModel && !requestedModel) {
    console.warn(
      `Deprecated GEMINI_MODEL "${normalizedModel}" detected; falling back to ${defaultModel}.`
    );
  }

  const buildModelCandidates = (availableModels: Set<string> | null): string[] => {
    const candidates: string[] = [];
    const push = (model?: string) => {
      if (model && !candidates.includes(model)) {
        candidates.push(model);
      }
    };

    push(requestedModel);
    push(defaultModel);
    if (defaultModel !== "gemini-flash-latest") {
      push("gemini-flash-latest");
    }
    if (availableModels?.has("gemini-1.5-flash")) {
      push("gemini-1.5-flash");
    }

    if (availableModels) {
      const sortedModels = Array.from(availableModels);
      const flashModel = sortedModels.find((model) => model.includes("flash"));
      const firstModel = sortedModels[0];
      push(flashModel);
      push(firstModel);
    }

    return candidates;
  };

  const warnOnce = new Set<string>();
  const logModelMismatch = (model: string, apiVersion: string) => {
    const key = `${apiVersion}:${model}`;
    if (warnOnce.has(key)) return;
    warnOnce.add(key);
    console.warn(
      `Gemini model "${model}" not found in ${apiVersion} model list; attempting anyway.`
    );
  };

  const logGeminiFailure = (
    response: Response,
    bodyText: string,
    apiVersion: string,
    model: string,
    withSearch: boolean
  ) => {
    console.error("Gemini request failed", {
      status: response.status,
      statusText: response.statusText,
      apiVersion,
      model,
      googleSearch: withSearch,
      body: bodyText,
    });
  };

  const buildGeminiError = (
    response: Response,
    bodyText: string,
    apiVersion: string,
    model: string,
    withSearch: boolean
  ): Error => {
    const excerpt = bodyText ? bodyText.slice(0, 300) : "No response body.";
    return new Error(
      `Gemini request failed with status ${response.status} ${response.statusText} ` +
        `(apiVersion=${apiVersion}, model=${model}, googleSearch=${withSearch}): ${excerpt}`
    );
  };

  const isModelNotFound = (response: Response, bodyText: string): boolean => {
    if (![400, 404].includes(response.status)) {
      return false;
    }
    const normalized = bodyText.toLowerCase();
    return normalized.includes("model") && normalized.includes("not");
  };

  const fetchAvailableModels = async (apiVersion: string): Promise<Set<string> | null> => {
    const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models?key=${apiKey}`;
    const response = await fetch(endpoint, { method: "GET" });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    };
    const names = new Set<string>();
    for (const model of payload.models ?? []) {
      if (
        model.name &&
        Array.isArray(model.supportedGenerationMethods) &&
        model.supportedGenerationMethods.includes("generateContent")
      ) {
        names.add(model.name.replace(/^models\//, ""));
      }
    }
    return names.size > 0 ? names : null;
  };

  try {
    const prompt = [
      `Find the latest commodity-related news about ${symbol} within the last ${timeWindowHours} hours.`,
      "Summarize into JSON with keys:",
      "{ items: [{ title, source, publishedAt, url, summary, sentiment, impact }], overallSentiment, keyThemes, watchlist }.",
      "Provide valid URLs to full stories.",
      `Limit to ${requestCount} items. Sentiment values: positive|negative|neutral. Impact: high|medium|low.`,
    ].join(" ");

    let response: Response | null = null;
    let lastError: Error | null = null;

    const availableModelsByVersion = new Map<string, Set<string> | null>();

    for (const apiVersion of apiVersions) {
      if (!availableModelsByVersion.has(apiVersion)) {
        availableModelsByVersion.set(apiVersion, await fetchAvailableModels(apiVersion));
      }
      const availableModels = availableModelsByVersion.get(apiVersion);
      const modelsToTry = buildModelCandidates(availableModels);

      for (const model of modelsToTry) {
        const supportsV1 = !model.startsWith("gemini-1.5");
        if (apiVersion === "v1" && !supportsV1) {
          continue;
        }
        if (availableModels && !availableModels.has(model)) {
          logModelMismatch(model, apiVersion);
        }

        const allowsSearch = enableSearch && apiVersion === "v1beta";
        const searchAttempts = allowsSearch ? [true, false] : [false];

        for (const withSearch of searchAttempts) {
          const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;
          const requestBody: Record<string, unknown> = {
            ...(withSearch ? { tools: [{ googleSearch: {} }] } : {}),
            generationConfig: {
              temperature: 0.2,
              ...(apiVersion === "v1beta" ? { responseMimeType: "application/json" } : {}),
            },
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
          };

          if (apiVersion === "v1beta") {
            requestBody.systemInstruction = {
              parts: [
                {
                  text: "You are a market news analyst. Respond ONLY with valid JSON. Do not include markdown.",
                },
              ],
            };
          }

          response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });

          if (response.ok) {
            break;
          }

          const errorBody = await response.text().catch(() => "");
          logGeminiFailure(response, errorBody, apiVersion, model, withSearch);
          lastError = buildGeminiError(response, errorBody, apiVersion, model, withSearch);

          if (withSearch && [400, 403].includes(response.status)) {
            continue;
          }

          if ([400, 403, 404].includes(response.status)) {
            if (availableModels && isModelNotFound(response, errorBody)) {
              console.warn(
                `Gemini model "${model}" rejected by API; trying fallback model from list.`
              );
            }
            response = null;
            continue;
          }

          throw lastError;
        }

        if (response?.ok) {
          break;
        }
      }

      if (response?.ok) {
        break;
      }
    }

    if (!response || !response.ok) {
      throw lastError ?? new Error("Gemini request failed.");
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const parsed = safeParseJson(text);
    if (!parsed) {
      const fallback = buildFallback(
        symbol,
        sanitizedPage,
        sanitizedLimit,
        "Failed to parse Gemini response."
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
    const message = error?.message ?? String(error);
    console.error("Gemini news error:", message);
    const fallback = buildFallback(
      symbol,
      sanitizedPage,
      sanitizedLimit,
      `Gemini request failed: ${message}`
    );
    setCacheValue(cacheKey, fallback, CACHE_TTL_MS);
    return fallback;
  }
}
