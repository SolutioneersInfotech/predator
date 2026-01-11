import fetch, { type Response } from "node-fetch";
import yahooFinance from "yahoo-finance2";
import { fetchCandlesFromBinance, type Candle } from "./fetchCandles.js";
import { computeATRSeries } from "../utils/indicatorTechnicalCalculation.js";
import { getCacheValue, setCacheValue } from "../utils/cache.js";
import { detectMarketType } from "../utils/marketType.js";

export type KeyLevelsResponse = {
  symbol: string;
  timeframe: string;
  asOf: string;
  resistance: { low: number; high: number };
  support: { low: number; high: number };
  vwap: number | null;
  liquidity: { side: "above" | "below"; price: number; note: string };
  source: "gemini" | "fallback";
};

const DEFAULT_TTL_SECONDS = 120;
const CACHE_TTL_MS =
  (Number(process.env.KEY_LEVELS_CACHE_TTL_SECONDS) || DEFAULT_TTL_SECONDS) * 1000;

const timeframeMsMap: Record<string, number> = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
};

const yahooIntervalMap = {
  "15m": "15m",
  "1h": "1h",
  "4h": "1h",
  "1d": "1d",
  "1w": "1wk",
} as const;

type YahooInterval = (typeof yahooIntervalMap)[keyof typeof yahooIntervalMap];

type GeminiKeyLevels = {
  resistance: { low: number; high: number };
  support: { low: number; high: number };
  liquidity: { side: "above" | "below"; price: number; note: string };
};

function safeParseJson(payload: string): Record<string, unknown> | null {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getLastFinite(values: (number | null)[]): number | null {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const value = values[i];
    if (value !== null && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatNotePrice(value: number, decimals: number): string {
  return roundTo(value, decimals).toString();
}

function normalizeRange(low: number, high: number) {
  if (low > high) {
    return { low: high, high: low };
  }
  return { low, high };
}

function normalizeMarketType(market: string | undefined, symbol: string): "crypto" | "equity" {
  if (market === "crypto") return "crypto";
  if (market === "equity" || market === "stock" || market === "commodity") return "equity";
  return detectMarketType(symbol) === "crypto" ? "crypto" : "equity";
}

async function fetchYahooCandles(symbol: string, tf: string, limit: number): Promise<Candle[]> {
  const interval = (yahooIntervalMap as Record<string, YahooInterval>)[tf] ?? "1d";
  const windowMs = timeframeMsMap[tf] ?? timeframeMsMap["1d"];
  const period2 = new Date();
  const period1 = new Date(period2.getTime() - windowMs * limit);

  const result = await yahooFinance.chart(symbol, {
    interval,
    period1,
    period2,
  });

  const quotes = result?.quotes ?? [];
  if (quotes.length === 0) {
    return [];
  }

  return quotes
    .map((quote) => ({
      time: new Date(quote.date).getTime(),
      open: quote.open ?? 0,
      high: quote.high ?? 0,
      low: quote.low ?? 0,
      close: quote.close ?? 0,
      volume: quote.volume ?? undefined,
    }))
    .filter((c) => Number.isFinite(c.close));
}

function buildFallback(
  symbol: string,
  timeframe: string,
  candles: Candle[],
  market: "crypto" | "equity",
  vwap: number | null
): KeyLevelsResponse {
  const recent = candles.slice(-200);
  const window = recent.slice(-100);
  const highs = window.map((c) => c.high);
  const lows = window.map((c) => c.low);
  const closes = recent.map((c) => c.close);

  const currentPrice = closes[closes.length - 1] ?? 0;
  const resistanceCandidate = highs.length > 0 ? Math.max(...highs) : currentPrice;
  const supportCandidate = lows.length > 0 ? Math.min(...lows) : currentPrice;

  const atrSeries = recent.length > 1
    ? computeATRSeries(
        recent.map((c) => c.high),
        recent.map((c) => c.low),
        recent.map((c) => c.close)
      )
    : [];
  const atr = getLastFinite(atrSeries);
  const basePrice = currentPrice || resistanceCandidate || supportCandidate || 1;
  const defaultWidth = basePrice * 0.003;
  const rawWidth = atr && atr > 0 ? atr : defaultWidth;
  const rangeWidth = clamp(rawWidth, basePrice * 0.001, basePrice * 0.02);

  const resistance = normalizeRange(
    resistanceCandidate - rangeWidth / 2,
    resistanceCandidate + rangeWidth / 2
  );
  const support = normalizeRange(
    supportCandidate - rangeWidth / 2,
    supportCandidate + rangeWidth / 2
  );

  const decimals = market === "crypto" ? 2 : 2;
  const roundedResistance = {
    low: roundTo(resistance.low, decimals),
    high: roundTo(resistance.high, decimals),
  };
  const roundedSupport = {
    low: roundTo(support.low, decimals),
    high: roundTo(support.high, decimals),
  };

  const liquiditySide: "above" | "below" =
    currentPrice < roundedResistance.low ? "above" : "below";
  const liquidityPrice =
    liquiditySide === "above" ? roundedResistance.high : roundedSupport.low;
  const liquidityNote =
    liquiditySide === "above"
      ? `Above ${formatNotePrice(liquidityPrice, decimals)}`
      : `Below ${formatNotePrice(liquidityPrice, decimals)}`;

  return {
    symbol,
    timeframe,
    asOf: new Date().toISOString(),
    resistance: roundedResistance,
    support: roundedSupport,
    vwap: vwap === null ? null : roundTo(vwap, decimals),
    liquidity: {
      side: liquiditySide,
      price: roundTo(liquidityPrice, decimals),
      note: liquidityNote,
    },
    source: "fallback",
  };
}

function buildPrompt(args: {
  symbol: string;
  timeframe: string;
  market: "crypto" | "equity";
  currentPrice: number;
  vwap: number | null;
  recentHigh: number;
  recentLow: number;
  swingHigh: number;
  swingLow: number;
  atr: number | null;
}): string {
  const { symbol, timeframe, market, currentPrice, vwap, recentHigh, recentLow, swingHigh, swingLow, atr } =
    args;

  return [
    `You are a market technician. Infer support/resistance zones and liquidity placement for ${symbol}.`,
    `Market: ${market}. Timeframe: ${timeframe}.`,
    `Current price: ${currentPrice}. VWAP: ${vwap ?? "null"}. ATR: ${atr ?? "null"}.`,
    `Recent high/low (last ~100 candles): ${recentHigh} / ${recentLow}.`,
    `Swing high/low (last ~20 candles): ${swingHigh} / ${swingLow}.`,
    "Return ONLY valid JSON with keys:",
    "{ resistance:{low,high}, support:{low,high}, liquidity:{side,price,note} }.",
    "side must be \"above\" or \"below\". note must be like 'Above 3150' or 'Below 3040'.",
    "No markdown or code fences.",
  ].join(" ");
}

function parseGeminiResponse(payload: Record<string, unknown>): GeminiKeyLevels | null {
  if (typeof payload !== "object" || payload === null) return null;
  const resistance = (payload as GeminiKeyLevels).resistance;
  const support = (payload as GeminiKeyLevels).support;
  const liquidity = (payload as GeminiKeyLevels).liquidity;

  if (
    !resistance ||
    typeof resistance.low !== "number" ||
    typeof resistance.high !== "number" ||
    !support ||
    typeof support.low !== "number" ||
    typeof support.high !== "number" ||
    !liquidity ||
    (liquidity.side !== "above" && liquidity.side !== "below") ||
    typeof liquidity.price !== "number" ||
    typeof liquidity.note !== "string"
  ) {
    return null;
  }

  return { resistance, support, liquidity };
}

export async function getKeyLevels(
  symbol: string,
  timeframe: string,
  limit: number,
  market?: string
): Promise<KeyLevelsResponse> {
  const normalizedMarket = normalizeMarketType(market, symbol);
  const cacheKey = `keyLevels:${symbol}:${timeframe}:${limit}:${normalizedMarket}`;
  const cached = getCacheValue<KeyLevelsResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  let candles: Candle[] = [];
  try {
    if (normalizedMarket === "crypto") {
      candles = await fetchCandlesFromBinance(symbol, timeframe, limit);
    } else {
      candles = await fetchYahooCandles(symbol, timeframe, limit);
    }
  } catch (error) {
    console.error("Key levels candle fetch error:", error);
  }

  if (!candles.length) {
    const fallback = buildFallback(symbol, timeframe, [], normalizedMarket, null);
    setCacheValue(cacheKey, fallback, CACHE_TTL_MS);
    return fallback;
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const currentPrice = closes[closes.length - 1] ?? 0;

  let vwap: number | null = null;
  let totalVolume = 0;
  let totalValue = 0;
  let volumeMissing = false;

  for (const candle of candles) {
    if (typeof candle.volume !== "number" || !Number.isFinite(candle.volume)) {
      volumeMissing = true;
      break;
    }
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    totalVolume += candle.volume;
    totalValue += typicalPrice * candle.volume;
  }

  if (!volumeMissing && totalVolume > 0) {
    vwap = totalValue / totalVolume;
  }

  const atrSeries = candles.length > 1 ? computeATRSeries(highs, lows, closes) : [];
  const atr = getLastFinite(atrSeries);

  const recentWindow = candles.slice(-100);
  const recentHigh = Math.max(...recentWindow.map((c) => c.high));
  const recentLow = Math.min(...recentWindow.map((c) => c.low));
  const swingWindow = candles.slice(-20);
  const swingHigh = Math.max(...swingWindow.map((c) => c.high));
  const swingLow = Math.min(...swingWindow.map((c) => c.low));

  const decimals = normalizedMarket === "crypto" ? 2 : 2;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallback = buildFallback(symbol, timeframe, candles, normalizedMarket, vwap);
    setCacheValue(cacheKey, fallback, CACHE_TTL_MS);
    return fallback;
  }

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

  const prompt = buildPrompt({
    symbol,
    timeframe,
    market: normalizedMarket,
    currentPrice: roundTo(currentPrice, decimals),
    vwap: vwap === null ? null : roundTo(vwap, decimals),
    recentHigh: roundTo(recentHigh, decimals),
    recentLow: roundTo(recentLow, decimals),
    swingHigh: roundTo(swingHigh, decimals),
    swingLow: roundTo(swingLow, decimals),
    atr: atr === null ? null : roundTo(atr, decimals),
  });

  let response: Response | null = null;
  let lastError: Error | null = null;
  const availableModelsByVersion = new Map<string, Set<string> | null>();

  try {
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
                  text: "You are a market technician. Respond ONLY with valid JSON. Do not include markdown.",
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
    const geminiLevels = parsed ? parseGeminiResponse(parsed) : null;

    if (!geminiLevels) {
      const fallback = buildFallback(symbol, timeframe, candles, normalizedMarket, vwap);
      setCacheValue(cacheKey, fallback, CACHE_TTL_MS);
      return fallback;
    }

    const resistance = normalizeRange(geminiLevels.resistance.low, geminiLevels.resistance.high);
    const support = normalizeRange(geminiLevels.support.low, geminiLevels.support.high);
    const normalizedLiquiditySide = geminiLevels.liquidity.side;
    const normalizedLiquidityPrice = geminiLevels.liquidity.price;
    const liquidityNote = geminiLevels.liquidity.note;

    const responseBody: KeyLevelsResponse = {
      symbol,
      timeframe,
      asOf: new Date().toISOString(),
      resistance: {
        low: roundTo(resistance.low, decimals),
        high: roundTo(resistance.high, decimals),
      },
      support: {
        low: roundTo(support.low, decimals),
        high: roundTo(support.high, decimals),
      },
      vwap: vwap === null ? null : roundTo(vwap, decimals),
      liquidity: {
        side: normalizedLiquiditySide,
        price: roundTo(normalizedLiquidityPrice, decimals),
        note: liquidityNote,
      },
      source: "gemini",
    };

    setCacheValue(cacheKey, responseBody, CACHE_TTL_MS);
    return responseBody;
  } catch (error) {
    console.error("Key levels Gemini error:", error);
    const fallback = buildFallback(symbol, timeframe, candles, normalizedMarket, vwap);
    setCacheValue(cacheKey, fallback, CACHE_TTL_MS);
    return fallback;
  }
}
