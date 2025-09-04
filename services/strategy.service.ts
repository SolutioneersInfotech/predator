

//  main ye hai

// import type { Candle } from "./fetchCandles.js";
// import { fetchCandlesFromBinance } from "./fetchCandles.js";

// /** types */
// type SlMethod = { type: "atr" } | { type: "percent"; value: number };
// type Signal = {
//     type: "BUY" | "SELL" | "HOLD";
//     time: number;
//     price: number;
//     reason?: string;
//     suggestedSL?: number;
//     suggestedTP?: number;
//     rr?: number;
// };

// /** SMA helper */
// function sma(values: number[], period: number): Array<number | null> {
//     const out: Array<number | null> = new Array(values.length).fill(null);
//     let sum = 0;
//     for (let i = 0; i < values.length; i++) {
//         sum += values[i];
//         if (i >= period) sum -= values[i - period];
//         if (i >= period - 1) out[i] = sum / period;
//     }
//     return out;
// }

// /** ATR helper */
// function atr(candles: Candle[], period = 14): Array<number | null> {
//     const trs: number[] = [];
//     for (let i = 0; i < candles.length; i++) {
//         if (i === 0) {
//             trs.push(candles[i].high - candles[i].low);
//         } else {
//             const prevClose = candles[i - 1].close;
//             const tr = Math.max(
//                 candles[i].high - candles[i].low,
//                 Math.abs(candles[i].high - prevClose),
//                 Math.abs(candles[i].low - prevClose)
//             );
//             trs.push(tr);
//         }
//     }
//     const out: Array<number | null> = new Array(candles.length).fill(null);
//     let sum = 0;
//     for (let i = 0; i < trs.length; i++) {
//         sum += trs[i];
//         if (i >= period) sum -= trs[i - period];
//         if (i >= period - 1) out[i] = sum / period;
//     }
//     return out;
// }

// /** Strategy Runner */
// export async function runMaCrossover(
//     commodity: string,
//     interval = "1d",
//     limit = 500,
//     slMethod: SlMethod = { type: "atr" }
// ) {
//     const commodityMap: Record<string, string> = {
//         XAUUSD: "XAUUSDT",
//         XAGUSD: "XAGUSDT",
//         BTCUSDT: "BTCUSDT",
//         ETHUSDT: "ETHUSDT"
//     };
//     const symbol = commodityMap[commodity] ?? commodity;

//     // Fetch candles
//     const candles = await fetchCandlesFromBinance(symbol, interval, limit);
//     if (!candles || candles.length === 0) throw new Error("No candle data");

//     const closes = candles.map(c => c.close);
//     const shortPeriod = 50, longPeriod = 200;

//     const smaShort = sma(closes, shortPeriod);
//     const smaLong = sma(closes, longPeriod);
//     const atrSeries = atr(candles, 14);

//     const signals: Signal[] = [];
//     const rr = 2; // risk-reward ratio

//     for (let i = 1; i < candles.length; i++) {
//         const prevS = smaShort[i - 1];
//         const prevL = smaLong[i - 1];
//         const curS = smaShort[i];
//         const curL = smaLong[i];

//         if (prevS == null || prevL == null || curS == null || curL == null) continue;

//         const entry = candles[i].close;

//         // Golden cross => BUY
//         if (prevS <= prevL && curS > curL) {
//             let risk: number;
//             if (slMethod.type === "atr" && atrSeries[i]) {
//                 risk = atrSeries[i]! * 1.5;
//             } else {
//                 const percent = (slMethod as any).value ?? 0.5;
//                 risk = entry * percent / 100;
//             }

//             const sl = entry - risk;   // SL below entry
//             const tp = entry + risk * rr; // TP above entry

//             signals.push({
//                 type: "BUY",
//                 time: candles[i].time,
//                 price: Number(entry.toFixed(8)),
//                 reason: `Golden cross SMA${shortPeriod}/${longPeriod}`,
//                 suggestedSL: Number(sl.toFixed(8)),
//                 suggestedTP: Number(tp.toFixed(8)),
//                 rr
//             });
//         }

//         // Death cross => SELL
//         else if (prevS >= prevL && curS < curL) {
//             let risk: number;
//             if (slMethod.type === "atr" && atrSeries[i]) {
//                 risk = atrSeries[i]! * 1.5;
//             } else {
//                 const percent = (slMethod as any).value ?? 0.5;
//                 risk = entry * percent / 100;
//             }

//             const sl = entry + risk;   // SL above entry
//             const tp = entry - risk * rr; // TP below entry

//             signals.push({
//                 type: "SELL",
//                 time: candles[i].time,
//                 price: Number(entry.toFixed(8)),
//                 reason: `Death cross SMA${shortPeriod}/${longPeriod}`,
//                 suggestedSL: Number(sl.toFixed(8)),
//                 suggestedTP: Number(tp.toFixed(8)),
//                 rr
//             });
//         }
//     }

//     return {
//         meta: { symbol, interval, candles: candles.length, strategy: `SMA ${shortPeriod}/${longPeriod}` },
//         candles,
//         smaShort,
//         smaLong,
//         signals
//     };
// }

import type { Candle } from "./fetchCandles.js";
import { fetchCandlesFromBinance } from "./fetchCandles.js";
import { calculateSLTP } from "./sltpCalculator.js";

type Signal = {
    type: "BUY" | "SELL" | "HOLD";
    time: number;
    price: number;
    reason?: string;
    entryRange?: [number, number];
    suggestedSL?: number[];
    suggestedTP?: number;
};

/** SMA helper */
function sma(values: number[], period: number): Array<number | null> {
    const out: Array<number | null> = new Array(values.length).fill(null);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (i >= period) sum -= values[i - period];
        if (i >= period - 1) out[i] = sum / period;
    }
    return out;
}

/** Strategy Runner */
export async function runMaCrossover(
    commodity: string,
    interval = "1d",
    limit = 500
) {
    const commodityMap: Record<string, string> = {
        XAUUSD: "XAUUSDT",
        XAGUSD: "XAGUSDT",
        BTCUSDT: "BTCUSDT",
        ETHUSDT: "ETHUSDT",
    };
    const symbol = commodityMap[commodity] ?? commodity;

    const candles = await fetchCandlesFromBinance(symbol, interval, limit);
    if (!candles || candles.length === 0) throw new Error("No candle data");

    const closes = candles.map((c) => c.close);
    const smaShort = sma(closes, 50);
    const smaLong = sma(closes, 200);

    const signals: Signal[] = [];

    for (let i = 1; i < candles.length; i++) {
        const prevS = smaShort[i - 1];
        const prevL = smaLong[i - 1];
        const curS = smaShort[i];
        const curL = smaLong[i];

        if (prevS == null || prevL == null || curS == null || curL == null)
            continue;

        const entry = candles[i].close;

        // Golden Cross → BUY
        if (prevS <= prevL && curS > curL) {
            const { entryRange, suggestedSL, suggestedTP } = calculateSLTP(
                entry,
                candles,
                i
            );
            signals.push({
                type: "BUY",
                time: candles[i].time,
                price: Number(entry.toFixed(2)),
                reason: "Golden Cross SMA50/200",
                entryRange,
                suggestedSL,
                suggestedTP,
            });
        }

        // Death Cross → SELL
        else if (prevS >= prevL && curS < curL) {
            const { entryRange, suggestedSL, suggestedTP } = calculateSLTP(
                entry,
                candles,
                i
            );
            signals.push({
                type: "SELL",
                time: candles[i].time,
                price: Number(entry.toFixed(2)),
                reason: "Death Cross SMA50/200",
                entryRange,
                suggestedSL,
                suggestedTP,
            });
        }
    }

    return {
        meta: {
            symbol,
            interval,
            candles: candles.length,
            strategy: "SMA 50/200",
        },
        candles,
        smaShort,   // ✅ add this
        smaLong,    // ✅ add this
        signals,
    };
}






