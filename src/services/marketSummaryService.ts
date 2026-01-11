import fetch, { type Response } from "node-fetch";
import yahooFinance from "yahoo-finance2";
import { computeSignal } from "./signalEngine.js";
import { fetchCandlesFromBinance } from "./fetchCandles.js";
import { detectMarketType } from "../utils/marketType.js";
import { getCacheValue, setCacheValue } from "../utils/cache.js";
import type { MarketSummary } from "../types/marketSummary.js";

const DEFAULT_TIMEFRAME = process.env.DEFAULT_TIMEFRAME || "4h";
const DEFAULT_CACHE_TTL_SECONDS = 90;
const MIN_CANDLES = 2;

const timeframeMsMap: Record<string, number> = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
};

const yahooIntervalMap: Record<string, "15m" | "1h" | "1d" | "1wk"> = {
  "15m": "15m",
  "1h": "1h",
  "4h": "1h",
  "1d": "1d",
  "1w": "1wk",
};

type IndicatorContext = {
  symbol: string;
  timeframe: string;
  timestamp: string;
  price: number | null;
  volume: number | null;
  rsi: number | null;
  rsiState: "overbought" | "oversold" | "neutral";
  macd: number | null;
  macdState: "bullish" | "bearish" | "neutral";
  ema20: number | null;
  ema20AbovePrice: boolean | null;
  trend: "up" | "down" | "sideways";
  confidence: number;
  support: number | null;
  resistance: number | null;
  rawSignal: "BUY" | "SELL" | "WAIT";
};

type GeminiSummary = {
  bias: MarketSummary["bias"];
  confidence: number;
  bullishFactors: string[];
  riskFactors: string[];
};

function parseCacheTtlMs(): number {
  const raw = Number(process.env.SUMMARY_CACHE_TTL_SECONDS ?? DEFAULT_CACHE_TTL_SECONDS);
  const sanitized = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_CACHE_TTL_SECONDS;
  return sanitized * 1000;
}

function getRsiState(rsi: number | null): "overbought" | "oversold" | "neutral" {
  if (rsi === null) return "neutral";
  if (rsi >= 70) return "overbought";
  if (rsi <= 30) return "oversold";
  return "neutral";
}

function getMacdState(macd: number | null): "bullish" | "bearish" | "neutral" {
  if (macd === null) return "neutral";
  if (macd > 0) return "bullish";
  if (macd < 0) return "bearish";
  return "neutral";
}

function mapTrend(trend: string): "up" | "down" | "sideways" {
  if (trend.toLowerCase().includes("bull")) return "up";
  if (trend.toLowerCase().includes("bear")) return "down";
  return "sideways";
}

function stripCodeFences(payload: string): string {
  return payload.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function normalizeFactors(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const words = item.split(/\s+/).slice(0, 10);
      return words.join(" ");
    })
    .slice(0, 4);
}

function isValidGeminiSummary(payload: unknown): payload is GeminiSummary {
  if (!payload || typeof payload !== "object") return false;
  const summary = payload as GeminiSummary;
  if (!summary.bias || !["bullish", "bearish", "neutral"].includes(summary.bias)) return false;
  if (!Number.isFinite(summary.confidence)) return false;
  if (!Array.isArray(summary.bullishFactors) || !Array.isArray(summary.riskFactors)) return false;
  return true;
}

async function fetchLatestVolume(symbol: string, timeframe: string, market: string): Promise<number | null> {
  try {
    if (market === "crypto") {
      const candles = await fetchCandlesFromBinance(symbol, timeframe, MIN_CANDLES);
      const last = candles[candles.length - 1];
      return last?.volume ?? null;
    }

    const interval = yahooIntervalMap[timeframe] ?? "1d";
    const windowMs = timeframeMsMap[timeframe] ?? timeframeMsMap["1d"];
    const period2 = new Date();
    const period1 = new Date(period2.getTime() - windowMs * MIN_CANDLES);

    const result = await yahooFinance.chart(symbol, { interval, period1, period2 });
    const quotes = result?.quotes ?? [];
    const last = quotes[quotes.length - 1];
    return last?.volume ?? null;
  } catch (error) {
    console.error("Volume fetch error:", error);
    return null;
  }
}

export async function buildIndicatorContext(symbol: string, timeframe = DEFAULT_TIMEFRAME) {
  const market = detectMarketType(symbol);
  const signal = await computeSignal(symbol, timeframe, 500, market);
  const volume = await fetchLatestVolume(symbol, timeframe, market);

  const price = signal.snapshot.price ?? null;
  const rsi = signal.snapshot.rsi ?? null;
  const macd = signal.snapshot.macd ?? null;
  const ema20 = signal.snapshot.emaFast ?? null;
  const ema20AbovePrice = ema20 !== null && price !== null ? ema20 > price : null;

  const context: IndicatorContext = {
    symbol,
    timeframe,
    timestamp: new Date().toISOString(),
    price,
    volume,
    rsi,
    rsiState: getRsiState(rsi),
    macd,
    macdState: getMacdState(macd),
    ema20,
    ema20AbovePrice,
    trend: mapTrend(signal.trend),
    confidence: signal.confidence,
    support: signal.keyLevels.support ?? null,
    resistance: signal.keyLevels.resistance ?? null,
    rawSignal: signal.signal,
  };

  return context;
}

function buildGeminiPrompt(context: IndicatorContext): string {
  const schema = {
    bias: "bullish",
    confidence: 72,
    bullishFactors: ["Short bullish factor"],
    riskFactors: ["Short risk factor"],
  };

  return [
    "Return VALID JSON only, no markdown.",
    "You are a market analyst. Use the real indicator context below.",
    "Keep bullishFactors and riskFactors to max 4 items each, max 10 words per item.",
    "Bias must be bullish, bearish, or neutral. Confidence is 0-100.",
    `JSON schema example: ${JSON.stringify(schema)}`,
    `Indicator context: ${JSON.stringify({
      symbol: context.symbol,
      timeframe: context.timeframe,
      timestamp: context.timestamp,
      price: context.price,
      volume: context.volume,
      rsi: context.rsi,
      rsiState: context.rsiState,
      macd: context.macd,
      macdState: context.macdState,
      ema20: context.ema20,
      ema20AbovePrice: context.ema20AbovePrice,
      trend: context.trend,
      support: context.support,
      resistance: context.resistance,
      confidence: context.confidence,
    })}`,
  ].join(" ");
}

async function parseGeminiJson(response: Response): Promise<GeminiSummary | null> {
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const cleaned = stripCodeFences(text);
  if (!cleaned) return null;
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (!isValidGeminiSummary(parsed)) return null;
    return {
      bias: parsed.bias,
      confidence: Math.round(Math.max(0, Math.min(100, parsed.confidence))),
      bullishFactors: normalizeFactors(parsed.bullishFactors),
      riskFactors: normalizeFactors(parsed.riskFactors),
    };
  } catch {
    return null;
  }
}

function logGeminiFailure(response: Response, bodyText: string) {
  console.error("Gemini summary request failed", {
    status: response.status,
    statusText: response.statusText,
    body: bodyText.slice(0, 300),
  });
}

export async function generateGeminiSummary(context: IndicatorContext): Promise<GeminiSummary | null> {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL?.replace(/^models\//, "").trim() || "gemini-flash-latest";
  const apiVersion = process.env.GEMINI_API_VERSION?.trim() || "v1beta";

  const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;
  const prompt = buildGeminiPrompt(context);

  const requestBody: Record<string, unknown> = {
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
          text: "Return VALID JSON only. Do not include markdown or commentary.",
        },
      ],
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    logGeminiFailure(response, errorBody);
    return null;
  }

  return parseGeminiJson(response);
}

export function fallbackSummary(context: IndicatorContext): GeminiSummary {
  const bullishFactors: string[] = [];
  const riskFactors: string[] = [];

  if (context.trend === "up") {
    bullishFactors.push("Uptrend intact");
  } else if (context.trend === "down") {
    riskFactors.push("Downtrend pressure");
  }

  if (context.ema20AbovePrice === false) {
    bullishFactors.push("Price above EMA20");
  } else if (context.ema20AbovePrice === true) {
    riskFactors.push("Price below EMA20");
  }

  if (context.macdState === "bullish") {
    bullishFactors.push("MACD momentum positive");
  } else if (context.macdState === "bearish") {
    riskFactors.push("MACD momentum negative");
  }

  if (context.rsiState === "oversold") {
    bullishFactors.push("RSI oversold rebound");
  } else if (context.rsiState === "overbought") {
    riskFactors.push("RSI overbought");
  }

  if (context.support !== null) {
    bullishFactors.push("Support holding");
  }

  if (context.resistance !== null) {
    riskFactors.push("Nearby resistance");
  }

  const normalizedBullish = normalizeFactors(bullishFactors);
  const normalizedRisk = normalizeFactors(riskFactors);

  if (normalizedBullish.length === 0) {
    normalizedBullish.push("Mixed momentum");
  }
  if (normalizedRisk.length === 0) {
    normalizedRisk.push("Limited downside signals");
  }

  let bias: GeminiSummary["bias"] = "neutral";
  if (context.rawSignal === "BUY") bias = "bullish";
  if (context.rawSignal === "SELL") bias = "bearish";

  return {
    bias,
    confidence: Math.round(Math.max(0, Math.min(100, context.confidence))),
    bullishFactors: normalizedBullish,
    riskFactors: normalizedRisk,
  };
}

function buildSummaryPayload(context: IndicatorContext, summary: GeminiSummary, source: MarketSummary["source"]): MarketSummary {
  const keyLevels: MarketSummary["keyLevels"] = {};
  if (context.support !== null) {
    keyLevels.support = [context.support];
  }
  if (context.resistance !== null) {
    keyLevels.resistance = [context.resistance];
  }

  return {
    symbol: context.symbol,
    timeframe: context.timeframe,
    timestamp: context.timestamp,
    bias: summary.bias,
    confidence: summary.confidence,
    bullishFactors: summary.bullishFactors,
    riskFactors: summary.riskFactors,
    ...(Object.keys(keyLevels).length > 0 ? { keyLevels } : {}),
    signals: {
      rsi: { value: context.rsi, state: context.rsiState },
      macd: { state: context.macdState },
      ema20: { abovePrice: context.ema20AbovePrice },
      trend: context.trend,
    },
    source,
  };
}

export async function getMarketSummary(symbol: string, timeframe = DEFAULT_TIMEFRAME): Promise<MarketSummary> {
  const cacheKey = `summary:${symbol}:${timeframe}`;
  const cached = getCacheValue<MarketSummary>(cacheKey);
  if (cached) {
    return cached;
  }

  const context = await buildIndicatorContext(symbol, timeframe);
  const geminiSummary = await generateGeminiSummary(context);
  const summary = geminiSummary ?? fallbackSummary(context);
  const source = geminiSummary ? "gemini" : "fallback";
  const payload = buildSummaryPayload(context, summary, source);

  setCacheValue(cacheKey, payload, parseCacheTtlMs());
  return payload;
}
