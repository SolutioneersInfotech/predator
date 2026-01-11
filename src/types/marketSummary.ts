export type MarketSummary = {
  symbol: string;
  timeframe: string;
  timestamp: string;
  bias: "bullish" | "bearish" | "neutral";
  confidence: number;
  bullishFactors: string[];
  riskFactors: string[];
  keyLevels?: {
    support?: number[];
    resistance?: number[];
  };
  signals: {
    rsi: { value: number | null; state: "overbought" | "oversold" | "neutral" };
    macd: { state: "bullish" | "bearish" | "neutral" };
    ema20: { abovePrice: boolean | null };
    trend: "up" | "down" | "sideways";
  };
  source: "gemini" | "fallback";
};
