import type { Candle } from "./fetchCandles.js";

/** 🔥 Common SL/TP Calculator based on handwritten rules */
export function calculateSLTP(entry: number, candles: Candle[], index: number) {
    // Entry Range = +5% → +7.5%
    const entryMin = entry * 1.05;
    const entryMax = entry * 1.075;

    // Stop Loss options
    const sl1 = entry * 0.90; // -10%
    const sl2 = entry * 0.85; // -15%

    // Tentative TP = +20%
    const tpTentative = entry * 1.20;

    // Actual TP = local max from last 20 candles
    const highs = candles
        .slice(Math.max(0, index - 20), index)
        .map((c) => c.high);
    const actualTP = highs.length > 0 ? Math.max(...highs) : tpTentative;

    return {
        entryRange: [Number(entryMin.toFixed(2)), Number(entryMax.toFixed(2))],
        suggestedSL: [Number(sl1.toFixed(2)), Number(sl2.toFixed(2))],
        suggestedTP: Number(actualTP.toFixed(2)),
    };
}
