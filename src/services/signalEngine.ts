import yahooFinance from "yahoo-finance2";
import { fetchCandlesFromBinance, type Candle } from "./fetchCandles.js";
import {
  computeADXSeries,
  computeATRSeries,
  computeEMASeries,
  computeMACDSeries,
  computeRSISeries,
} from "../utils/indicatorTechnicalCalculation.js";
import { detectMarketType } from "../utils/marketType.js";
import { getCacheValue, setCacheValue } from "../utils/cache.js";

type SignalSnapshot = {
  rsi: number | null;
  macd: number | null;
  emaFast: number | null;
  emaSlow: number | null;
  atr: number | null;
  adx: number | null;
  price: number | null;
};

type SignalScores = {
  trend: number;
  momentum: number;
  oscillators: number;
  risk: number;
};

export type TimeframeSignal = {
  tf: string;
  signal: "BUY" | "SELL" | "WAIT";
  confidence: number;
  trend: "Bullish" | "Bearish" | "Range" | "Neutral";
  scores: SignalScores;
  keyLevels: { support: number | null; resistance: number | null };
  snapshot: SignalSnapshot;
};

export type SignalResult = {
  success: true;
  symbol: string;
  asOf: string;
  timeframes: TimeframeSignal[];
  overall: { bias: "Bullish" | "Bearish" | "Neutral"; confidence: number; bestTimeframe: string };
};

const CACHE_TTL_MS = 45_000;
const MIN_CANDLES = 60;

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getLastValue(series: (number | null)[]): number | null {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const value = series[i];
    if (value !== null && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
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

  const timestamps = result?.timestamp ?? [];
  const quotes = result?.indicators?.quote?.[0];

  if (!quotes || timestamps.length === 0) {
    return [];
  }

  return timestamps.map((timestamp, idx) => ({
    time: timestamp * 1000,
    open: quotes.open?.[idx] ?? 0,
    high: quotes.high?.[idx] ?? 0,
    low: quotes.low?.[idx] ?? 0,
    close: quotes.close?.[idx] ?? 0,
    volume: quotes.volume?.[idx] ?? undefined,
  })).filter((c) => Number.isFinite(c.close));
}

function buildEmptySignal(tf: string): TimeframeSignal {
  return {
    tf,
    signal: "WAIT",
    confidence: 25,
    trend: "Neutral",
    scores: { trend: 0, momentum: 0, oscillators: 0, risk: 0 },
    keyLevels: { support: null, resistance: null },
    snapshot: { rsi: null, macd: null, emaFast: null, emaSlow: null, atr: null, adx: null, price: null },
  };
}

export async function computeSignal(
  symbol: string,
  tf: string,
  limit = 500,
  market?: string
): Promise<TimeframeSignal> {
  const cacheKey = `signal:${symbol}:${tf}:${limit}:${market ?? "auto"}`;
  const cached = getCacheValue<TimeframeSignal>(cacheKey);
  if (cached) {
    return cached;
  }

  const type = market ?? detectMarketType(symbol);
  let candles: Candle[] = [];

  try {
    if (type === "crypto") {
      candles = await fetchCandlesFromBinance(symbol, tf, limit);
    } else {
      candles = await fetchYahooCandles(symbol, tf, limit);
    }
  } catch (error) {
    console.error("Signal candle fetch error:", error);
  }

  if (candles.length < MIN_CANDLES) {
    const emptySignal = buildEmptySignal(tf);
    setCacheValue(cacheKey, emptySignal, CACHE_TTL_MS);
    return emptySignal;
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const price = closes[closes.length - 1] ?? null;

  const emaFastSeries = computeEMASeries(closes, 20);
  const emaSlowSeries = computeEMASeries(closes, 50);
  const rsiSeries = computeRSISeries(closes, 14);
  const macdSeries = computeMACDSeries(closes, 12, 26, 9);
  const atrSeries = computeATRSeries(highs, lows, closes, 14);
  const adxSeries = computeADXSeries(highs, lows, closes, 14);

  const emaFast = getLastValue(emaFastSeries);
  const emaSlow = getLastValue(emaSlowSeries);
  const rsi = getLastValue(rsiSeries);
  const macd = getLastValue(macdSeries.macd);
  const macdHist = getLastValue(macdSeries.hist);
  const macdHistPrev = macdSeries.hist.length > 1 ? macdSeries.hist[macdSeries.hist.length - 2] : null;
  const atr = getLastValue(atrSeries);
  const adx = getLastValue(adxSeries);

  const trendDirection = emaFast !== null && emaSlow !== null ? Math.sign(emaFast - emaSlow) : 0;
  const adxStrength = adx !== null ? clamp(adx / 50, 0, 1) : 0;
  const trendBias = trendDirection * adxStrength;
  const trendScore = Math.abs(trendBias);

  const histDirection = macdHist !== null ? Math.sign(macdHist) : 0;
  const histSlope = macdHistPrev !== null && macdHist !== null ? Math.sign(macdHist - macdHistPrev) : 0;
  const momentumBias = clamp(histDirection * 0.7 + histSlope * 0.3, -1, 1);
  const momentumScore = Math.abs(momentumBias);

  let oscillatorBias = 0;
  let oscillatorScore = 0.5;
  if (rsi !== null) {
    if (rsi < 30) {
      oscillatorBias = 1;
      oscillatorScore = 1;
    } else if (rsi > 70) {
      oscillatorBias = -1;
      oscillatorScore = 1;
    } else {
      oscillatorBias = 0;
      oscillatorScore = 0.5;
    }
  }

  const atrNormalized = atr !== null && price ? atr / price : 0;
  const riskScore = clamp(atrNormalized * 10, 0, 1);

  const weightedConfidence =
    trendScore * 0.35 +
    momentumScore * 0.3 +
    oscillatorScore * 0.25 +
    (1 - riskScore) * 0.1;
  const confidence = Math.round(clamp(weightedConfidence, 0, 1) * 100);

  const compositeBias =
    trendBias * 0.35 +
    momentumBias * 0.3 +
    oscillatorBias * 0.25 -
    riskScore * 0.1;

  const threshold = 0.2;
  let signal: "BUY" | "SELL" | "WAIT" = "WAIT";
  if (compositeBias > threshold && confidence >= 55) {
    signal = "BUY";
  } else if (compositeBias < -threshold && confidence >= 55) {
    signal = "SELL";
  }

  let trend: "Bullish" | "Bearish" | "Range" | "Neutral" = "Neutral";
  if (adx !== null && adx < 20) {
    trend = "Range";
  } else if (trendBias > 0.2) {
    trend = "Bullish";
  } else if (trendBias < -0.2) {
    trend = "Bearish";
  }

  const levelWindow = candles.slice(-20);
  const support = levelWindow.length > 0 ? Math.min(...levelWindow.map((c) => c.low)) : null;
  const resistance = levelWindow.length > 0 ? Math.max(...levelWindow.map((c) => c.high)) : null;

  const result: TimeframeSignal = {
    tf,
    signal,
    confidence,
    trend,
    scores: {
      trend: clamp(trendScore, 0, 1),
      momentum: clamp(momentumScore, 0, 1),
      oscillators: clamp(oscillatorScore, 0, 1),
      risk: clamp(riskScore, 0, 1),
    },
    keyLevels: { support, resistance },
    snapshot: { rsi, macd, emaFast, emaSlow, atr, adx, price },
  };

  setCacheValue(cacheKey, result, CACHE_TTL_MS);
  return result;
}

export function summarizeOverall(timeframes: TimeframeSignal[]): SignalResult["overall"] {
  if (timeframes.length === 0) {
    return { bias: "Neutral", confidence: 0, bestTimeframe: "" };
  }

  const scored = timeframes.map((tf) => {
    const direction = tf.signal === "BUY" ? 1 : tf.signal === "SELL" ? -1 : 0;
    return {
      tf: tf.tf,
      score: direction * tf.confidence,
      confidence: tf.confidence,
    };
  });

  const best = scored.reduce((prev, current) => (current.confidence > prev.confidence ? current : prev));
  const avgScore = scored.reduce((sum, current) => sum + current.score, 0) / scored.length;
  const avgConfidence = Math.round(scored.reduce((sum, current) => sum + current.confidence, 0) / scored.length);

  let bias: "Bullish" | "Bearish" | "Neutral" = "Neutral";
  if (avgScore > 15) bias = "Bullish";
  if (avgScore < -15) bias = "Bearish";

  return { bias, confidence: avgConfidence, bestTimeframe: best.tf };
}
