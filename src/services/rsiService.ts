

// import axios from "axios";

// export interface RSISignal {
//     time: string;
//     rsi: number;
//     signal: "BUY" | "SELL" | "NEUTRAL";
// }

// const API_KEY = process.env.ALPHA_VANTAGE_KEY || "BXX8DMFBRW3NNJQ1"; // temporary: move to env

// function getSignalFromRSI(rsi: number): "BUY" | "SELL" | "NEUTRAL" {
//     if (rsi < 40) return "BUY";
//     if (rsi > 60) return "SELL";
//     return "NEUTRAL";
// }

// export async function runRSIStrategy(
//     symbol: string,
//     interval: string = "15min",
//     period: number = 14
// ): Promise<RSISignal[]> {
//     try {
//         // 🧹 Cleanup: remove "-" so BTC-USD -> BTCUSD (AlphaVantage format)
//         let cleanSymbol = symbol.replace("-", "");
//         // check if last character is 'T'
//         if (cleanSymbol.endsWith("T")) {
//             cleanSymbol = cleanSymbol.slice(0, -1); // remove last character
//         }
//         console.log(`Running RSI for ${cleanSymbol} at ${interval}`);

//         const url = `https://www.alphavantage.co/query?function=RSI&symbol=${encodeURIComponent(
//             cleanSymbol
//         )}&interval=${encodeURIComponent(interval)}&time_period=${period}&series_type=close&apikey=${API_KEY}`;

//         const { data } = await axios.get(url, { timeout: 10000 });

//         console.log("AlphaVantage top-level keys:", Object.keys(data));

//         const note = data?.Note || data?.["Error Message"] || data?.Information;
//         if (note) {
//             console.error("AlphaVantage returned a Note/Error:", note);
//             throw new Error(`AlphaVantage message: ${note}`);
//         }

//         const rsiData = data["Technical Analysis: RSI"];
//         if (!rsiData || Object.keys(rsiData).length === 0) {
//             console.error("RSI block missing. Full response keys:", Object.keys(data));
//             throw new Error("RSI data not found - check symbol/interval/key/rate-limit");
//         }

//         const parsed: RSISignal[] = Object.entries(rsiData)
//             .map(([time, val]: any) => {
//                 const rsi = parseFloat(val.RSI);
//                 return {
//                     time,
//                     rsi: Number.isFinite(rsi) ? Number(rsi.toFixed(2)) : NaN,
//                     signal: Number.isFinite(rsi) ? getSignalFromRSI(rsi) : "NEUTRAL",
//                 };
//             })
//             .reverse(); // oldest -> latest

//         return parsed;
//     } catch (err: any) {
//         console.error("runRSIStrategy error:", err?.message ?? err);
//         throw err;
//     }
// }


// import axios from "axios";

// export interface RSISignal {
//     time: string;
//     rsi: number;
//     signal: "BUY" | "SELL" | "NEUTRAL";
// }

// const API_KEY = process.env.ALPHA_VANTAGE_KEY || "BXX8DMFBRW3NNJQ1"; // temporary: move to env

// function getSignalFromRSI(rsi: number): "BUY" | "SELL" | "NEUTRAL" {
//     if (rsi < 40) return "BUY";
//     if (rsi > 60) return "SELL";
//     return "NEUTRAL";
// }

// export async function runRSIStrategy(
//     symbol: string,
//     interval: string = "15min",
//     period: number = 14
// ): Promise<RSISignal[]> {
//     try {
//         let cleanSymbol = symbol.replace("-", "");
//         if (cleanSymbol.endsWith("T")) {
//             cleanSymbol = cleanSymbol.slice(0, -1);
//         }

//         // ✅ convert 1d → daily, 1w → weekly, 1m → monthly
//         const intervalMap: Record<string, string> = {
//             "1d": "daily",
//             "1w": "weekly",
//             "1m": "monthly"
//         };
//         const apiInterval = intervalMap[interval] || interval;

//         console.log(`Running RSI for ${cleanSymbol} at ${apiInterval}`);

//         const url = `https://www.alphavantage.co/query?function=RSI&symbol=${encodeURIComponent(
//             cleanSymbol
//         )}&interval=${encodeURIComponent(apiInterval)}&time_period=${period}&series_type=close&apikey=${API_KEY}`;

//         const { data } = await axios.get(url, { timeout: 10000 });

//         console.log("AlphaVantage top-level keys:", Object.keys(data));

//         const note = data?.Note || data?.["Error Message"] || data?.Information;
//         if (note) {
//             console.error("AlphaVantage returned a Note/Error:", note);
//             throw new Error(`AlphaVantage message: ${note}`);
//         }

//         const rsiData = data["Technical Analysis: RSI"];
//         if (!rsiData || Object.keys(rsiData).length === 0) {
//             console.error("RSI block missing. Full response keys:", Object.keys(data));
//             throw new Error("RSI data not found - check symbol/interval/key/rate-limit");
//         }

//         const parsed: RSISignal[] = Object.entries(rsiData)
//             .map(([time, val]: any) => {
//                 const rsi = parseFloat(val.RSI);
//                 return {
//                     time,
//                     rsi: Number.isFinite(rsi) ? Number(rsi.toFixed(2)) : NaN,
//                     signal: Number.isFinite(rsi) ? getSignalFromRSI(rsi) : "NEUTRAL",
//                 };
//             })
//             .reverse(); // oldest -> latest

//         return parsed;
//     } catch (err: any) {
//         console.error("runRSIStrategy error:", err?.message ?? err);
//         throw err;
//     }
// }


// import axios from "axios";
// import { fetchCandlesFromBinance } from "./fetchCandles.js";

// export interface RSISignal {
//     time: string;          // candle time
//     open: number;           // from Binance
//     high: number;           // from Binance
//     low: number;             // from Binance
//     close: number;           // from Binance
//     rsi: number;             // from Alpha Vantage
//     signal: "BUY" | "SELL" | "NEUTRAL";
// }

// const API_KEY = process.env.ALPHA_VANTAGE_KEY || "BXX8DMFBRW3NNJQ1";

// function getSignalFromRSI(rsi: number): "BUY" | "SELL" | "NEUTRAL" {
//     if (rsi < 40) return "BUY";
//     if (rsi > 60) return "SELL";
//     return "NEUTRAL";
// }

// export async function runRSIStrategy(
//     symbol: string,
//     interval: string = "1d",  // Binance interval
//     period: number = 14
// ): Promise<RSISignal[]> {
//     try {
//         // ✅ Binance se candles lao
//         const candles = await fetchCandlesFromBinance(symbol, interval, 500);
//         if (!candles || candles.length === 0) {
//             throw new Error("No candle data from Binance");
//         }

//         // ✅ Alpha Vantage interval map
//         const intervalMap: Record<string, string> = {
//             "1d": "daily",
//             "1w": "weekly",
//             "1m": "monthly"
//         };
//         const apiInterval = intervalMap[interval] || interval;

//         // ✅ Clean symbol for Vantage
//         let cleanSymbol = symbol.replace("-", "");
//         if (cleanSymbol.endsWith("T")) {
//             cleanSymbol = cleanSymbol.slice(0, -1);
//         }

//         console.log(`Running RSI for ${cleanSymbol} at ${apiInterval}`);

//         const url = `https://www.alphavantage.co/query?function=RSI&symbol=${encodeURIComponent(
//             cleanSymbol
//         )}&interval=${encodeURIComponent(apiInterval)}&time_period=${period}&series_type=close&apikey=${API_KEY}`;

//         const { data } = await axios.get(url, { timeout: 10000 });

//         const note = data?.Note || data?.["Error Message"] || data?.Information;
//         if (note) throw new Error(`AlphaVantage message: ${note}`);

//         const rsiData = data["Technical Analysis: RSI"];
//         if (!rsiData || Object.keys(rsiData).length === 0) {
//             throw new Error("RSI data not found - check symbol/interval/key/rate-limit");
//         }

//         // ✅ Convert RSI into object: {date -> rsi}
//         const rsiMap: Record<string, number> = {};
//         for (const [time, val] of Object.entries(rsiData) as any) {
//             const r = parseFloat((val as any).RSI);
//             if (!isNaN(r)) rsiMap[time] = r;
//         }

//         // ✅ Merge Binance candles with RSI values by date (YYYY-MM-DD)
//         const merged: RSISignal[] = candles.map((c) => {
//             const date = new Date(c.time).toISOString().slice(0, 10);
//             const rsi = rsiMap[date];
//             return {
//                 time: date,
//                 open: c.open,
//                 high: c.high,
//                 low: c.low,
//                 close: c.close,
//                 rsi: rsi ?? NaN,
//                 signal: Number.isFinite(rsi) ? getSignalFromRSI(rsi) : "NEUTRAL",
//             };
//         });

//         return merged;
//     } catch (err: any) {
//         console.error("runRSIStrategy error:", err?.message ?? err);
//         throw err;
//     }
// }

// import axios from "axios";
// import { fetchCandlesFromBinance } from "./fetchCandles.js";

// export interface RSIStrategyResponse {
//     candles: { time: number; open: number; high: number; low: number; close: number }[];
//     rsiSignals: { time: number; rsi: number; signal: "BUY" | "SELL" | "NEUTRAL" }[];
// }

// const API_KEY = process.env.ALPHA_VANTAGE_KEY || "BXX8DMFBRW3NNJQ1";

// // Helper function to determine signal from RSI value
// function getSignalFromRSI(rsi: number): "BUY" | "SELL" | "NEUTRAL" {
//     if (rsi < 40) return "BUY";
//     if (rsi > 60) return "SELL";
//     return "NEUTRAL";
// }

// export async function runRSIStrategy(
//     symbol: string,
//     interval: string = "1d",
//     period: number = 14
// ): Promise<RSIStrategyResponse> {
//     try {
//         const candles = await fetchCandlesFromBinance(symbol, interval, 500);
//         if (!candles || candles.length === 0) throw new Error("No candle data");

//         const intervalMap: Record<string, string> = { "1d": "daily", "1w": "weekly", "1m": "monthly" };
//         const apiInterval = intervalMap[interval] || interval;

//         let cleanSymbol = symbol.replace("-", "");
//         if (cleanSymbol.endsWith("T")) cleanSymbol = cleanSymbol.slice(0, -1);

//         const url = `https://www.alphavantage.co/query?function=RSI&symbol=${encodeURIComponent(
//             cleanSymbol
//         )}&interval=${encodeURIComponent(apiInterval)}&time_period=${period}&series_type=close&apikey=${API_KEY}`;

//         const { data } = await axios.get(url, { timeout: 10000 });
//         const note = data?.Note || data?.["Error Message"] || data?.Information;
//         if (note) throw new Error(`AlphaVantage message: ${note}`);

//         const rsiData = data["Technical Analysis: RSI"];
//         if (!rsiData || Object.keys(rsiData).length === 0) throw new Error("RSI data not found");

//         const rsiMap: Record<string, number> = {};
//         for (const [time, val] of Object.entries(rsiData) as any) {
//             const r = parseFloat((val as any).RSI);
//             if (!isNaN(r)) rsiMap[time] = r;
//         }

//         const candlesData = candles.map((c) => ({
//             time: c.time, // timestamp in ms
//             open: c.open,
//             high: c.high,
//             low: c.low,
//             close: c.close,
//         }));

//         const rsiSignals = candles.map((c) => {
//             const dateStr = new Date(c.time).toISOString().slice(0, 10); // match AlphaVantage date
//             const rsi = rsiMap[dateStr];
//             return {
//                 time: c.time, // **use same timestamp as candle** for syncing charts
//                 rsi: rsi ?? NaN,
//                 signal: Number.isFinite(rsi) ? getSignalFromRSI(rsi) : "NEUTRAL",
//             };
//         });

//         return { candles: candlesData, rsiSignals };
//     } catch (err: any) {
//         console.error("runRSIStrategy error:", err?.message ?? err);
//         throw err;
//     }
// }

// import axios from "axios";
// import { fetchCandlesFromBinance } from "./fetchCandles.js";

// export interface RSIStrategyResponse {
//     candles: { time: number; open: number; high: number; low: number; close: number }[];
//     rsiSignals: { time: number; rsi: number; signal: "BUY" | "SELL" | "NEUTRAL" }[];
//     signalsForCard: {
//         strategy: string;
//         type: "BUY" | "SELL";
//         price: number;
//         reason?: string;
//         suggestedSL?: number[];
//         suggestedTP?: number;
//     }[];
// }

// const API_KEY = process.env.ALPHA_VANTAGE_KEY || "BXX8DMFBRW3NNJQ1";

// // Helper function to determine signal from RSI value
// function getSignalFromRSI(rsi: number): "BUY" | "SELL" | "NEUTRAL" {
//     if (rsi < 40) return "BUY";
//     if (rsi > 60) return "SELL";
//     return "NEUTRAL";
// }

// export async function runRSIStrategy(
//     symbol: string,
//     interval: string = "1d",
//     period: number = 14
// ): Promise<RSIStrategyResponse> {
//     try {
//         // 1️⃣ Fetch candles from Binance
//         const candles = await fetchCandlesFromBinance(symbol, interval, 500);
//         if (!candles || candles.length === 0) throw new Error("No candle data");

//         // 2️⃣ Map interval for AlphaVantage
//         const intervalMap: Record<string, string> = { "1d": "daily", "1w": "weekly", "1m": "monthly" };
//         const apiInterval = intervalMap[interval] || interval;

//         let cleanSymbol = symbol.replace("-", "");
//         if (cleanSymbol.endsWith("T")) cleanSymbol = cleanSymbol.slice(0, -1);

//         // 3️⃣ Fetch RSI from AlphaVantage
//         const url = `https://www.alphavantage.co/query?function=RSI&symbol=${encodeURIComponent(
//             cleanSymbol
//         )}&interval=${encodeURIComponent(apiInterval)}&time_period=${period}&series_type=close&apikey=${API_KEY}`;

//         const { data } = await axios.get(url, { timeout: 10000 });
//         const note = data?.Note || data?.["Error Message"] || data?.Information;
//         if (note) throw new Error(`AlphaVantage message: ${note}`);

//         const rsiData = data["Technical Analysis: RSI"];
//         if (!rsiData || Object.keys(rsiData).length === 0) throw new Error("RSI data not found");

//         // 4️⃣ Convert RSI data to map
//         const rsiMap: Record<string, number> = {};
//         for (const [time, val] of Object.entries(rsiData) as any) {
//             const r = parseFloat((val as any).RSI);
//             if (!isNaN(r)) rsiMap[time] = r;
//         }

//         // 5️⃣ Prepare candles data for chart
//         const candlesData = candles.map((c) => ({
//             time: c.time,
//             open: c.open,
//             high: c.high,
//             low: c.low,
//             close: c.close,
//         }));

//         // 6️⃣ Prepare RSI signals for chart (minimal)
//         const rsiSignals = candles.map((c) => {
//             const dateStr = new Date(c.time).toISOString().slice(0, 10);
//             const rsi = rsiMap[dateStr];
//             return {
//                 time: c.time,
//                 rsi: rsi ?? NaN,
//                 signal: Number.isFinite(rsi) ? getSignalFromRSI(rsi) : "NEUTRAL",
//             };
//         });

//         // 7️⃣ Prepare signals for card (enriched)
//         const signalsForCard = rsiSignals
//             .filter(s => s.signal !== "NEUTRAL")
//             .map(s => {
//                 // ✅ Find nearest candle to RSI timestamp
//                 let nearestCandle = candles.reduce((prev, curr) =>
//                     Math.abs(curr.time - s.time) < Math.abs(prev.time - s.time) ? curr : prev
//                     , candles[0]);

//                 const price = nearestCandle.close;

//                 return {
//                     strategy: "rsi",
//                     type: s.signal as "BUY" | "SELL",
//                     price,
//                     reason: `RSI: ${s.rsi?.toFixed(2)}`,
//                     suggestedSL: s.signal === "BUY" ? [price * 0.98] : [price * 1.02],
//                     suggestedTP: s.signal === "BUY" ? price * 1.05 : price * 0.95
//                 };
//             });

//         // 8️⃣ Return everything
//         return { candles: candlesData, rsiSignals, signalsForCard };

//     } catch (err: any) {
//         console.error("runRSIStrategy error:", err?.message ?? err);
//         throw err;
//     }
// }

import axios from "axios";
import { fetchCandlesFromBinance } from "./fetchCandles.js";

export interface RSIStrategyResponse {
    candles: { time: number; open: number; high: number; low: number; close: number }[];
    rsiSignals: { time: number; rsi: number; signal: "BUY" | "SELL" | "NEUTRAL" }[];
    signals: {
        strategy: string;
        type: "BUY" | "SELL";
        price: number;
        reason?: string;
        suggestedSL?: number[];
        suggestedTP?: number;
    }[];
}

const API_KEY = process.env.ALPHA_VANTAGE_KEY || "BXX8DMFBRW3NNJQ1";

function getSignalFromRSI(rsi: number): "BUY" | "SELL" | "NEUTRAL" {
    if (rsi < 40) return "BUY";
    if (rsi > 60) return "SELL";
    return "NEUTRAL";
}

export async function runRSIStrategy(
    symbol: string,
    interval: string = "1d",
    period: number = 14
): Promise<RSIStrategyResponse> {
    try {
        const candles = await fetchCandlesFromBinance(symbol, interval, 500);
        if (!candles || candles.length === 0) throw new Error("No candle data");

        const intervalMap: Record<string, string> = { "1d": "daily", "1w": "weekly", "1m": "monthly" };
        const apiInterval = intervalMap[interval] || interval;

        let cleanSymbol = symbol.replace("-", "");
        if (cleanSymbol.endsWith("T")) cleanSymbol = cleanSymbol.slice(0, -1);

        const url = `https://www.alphavantage.co/query?function=RSI&symbol=${encodeURIComponent(
            cleanSymbol
        )}&interval=${encodeURIComponent(apiInterval)}&time_period=${period}&series_type=close&apikey=${API_KEY}`;

        const { data } = await axios.get(url, { timeout: 10000 });
        const note = data?.Note || data?.["Error Message"] || data?.Information;
        if (note) throw new Error(`AlphaVantage message: ${note}`);

        const rsiData = data["Technical Analysis: RSI"];
        if (!rsiData || Object.keys(rsiData).length === 0) throw new Error("RSI data not found");

        const rsiMap: Record<string, number> = {};
        for (const [time, val] of Object.entries(rsiData) as any) {
            const r = parseFloat((val as any).RSI);
            if (!isNaN(r)) rsiMap[time] = r;
        }

        const candlesData = candles.map((c) => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));

        const rsiSignals = candles.map((c) => {
            const dateStr = new Date(c.time).toISOString().slice(0, 10);
            const rsi = rsiMap[dateStr];
            return {
                time: c.time,
                rsi: rsi ?? NaN,
                signal: Number.isFinite(rsi) ? getSignalFromRSI(rsi) : "NEUTRAL",
            };
        });

        const latestSignal = [...rsiSignals].reverse().find(s => s.signal !== "NEUTRAL");

        let signals: RSIStrategyResponse["signals"] = [];
        if (latestSignal) {
            const nearestCandle = candles.reduce((prev, curr) =>
                Math.abs(curr.time - latestSignal.time) < Math.abs(prev.time - latestSignal.time) ? curr : prev,
                candles[0]
            );

            const price = nearestCandle.close;

            signals.push({
                strategy: "rsi",
                type: latestSignal.signal as "BUY" | "SELL",
                price,
                reason: `RSI: ${latestSignal.rsi?.toFixed(2)}`,
                suggestedSL: latestSignal.signal === "BUY" ? [price * 0.98] : [price * 1.02],
                suggestedTP: latestSignal.signal === "BUY" ? price * 1.05 : price * 0.95
            });
        }

        return { candles: candlesData, rsiSignals, signals };

    } catch (err: any) {
        console.error("runRSIStrategy error:", err?.message ?? err);
        throw err;
    }
}
