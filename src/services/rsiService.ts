// import axios from "axios";

// const API_KEY = "BXX8DMFBRW3NNJQ1";

// export interface RSISignal {
//     time: string;
//     rsi: number;
//     signal: "BUY" | "SELL" | "NEUTRAL";
// }

// function getSignalFromRSI(rsi: number): "BUY" | "SELL" | "NEUTRAL" {
//     if (rsi < 30) return "BUY";
//     if (rsi > 70) return "SELL";
//     return "NEUTRAL";
// }

// export async function runRSIStrategy(
//     symbol: string,
//     interval: string = "15min",
//     period: number = 14
// ): Promise<RSISignal[]> {
//     const url = `https://www.alphavantage.co/query?function=RSI&symbol=${symbol}&interval=${interval}&time_period=${period}&apikey=${API_KEY}`;

//     const { data } = await axios.get(url);
//     const rsiData = data["Technical Analysis: RSI"];

//     if (!rsiData) throw new Error("RSI data not found");
//     console.log("Alpha response:", JSON.stringify(data, null, 2));

//     const signals: RSISignal[] = Object.entries(rsiData).map(([time, val]: any) => {
//         const rsi = parseFloat(val.RSI);
//         const signal = getSignalFromRSI(rsi);
//         return { time, rsi, signal };
//     }).reverse();

//     return signals;
// }

// src/services/rsiService.ts
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
//     const url = `https://www.alphavantage.co/query?function=RSI&symbol=${encodeURIComponent(
//         symbol
//     )}&interval=${encodeURIComponent(interval)}&time_period=${period}&series_type=close&apikey=${API_KEY}`;

//     try {
//         const { data } = await axios.get(url, { timeout: 10000 });

//         // 1) ALWAYS log top-level keys so we can see what Alpha returned (do NOT paste logs with key publicly)
//         console.log("AlphaVantage top-level keys:", Object.keys(data));

//         // 2) If API returned a Note / Error Message / Information => print and throw (rate-limit / invalid call)
//         const note = data?.Note || data?.["Error Message"] || data?.Information;
//         if (note) {
//             console.error("AlphaVantage returned a Note/Error:", note);
//             throw new Error(`AlphaVantage message: ${note}`);
//         }

//         // (optional) for debugging: print a small snippet (avoid huge dump in prod)
//         // console.log("AlphaVantage sample response:", JSON.stringify(data, null, 2));

//         // 3) Now inspect the expected RSI block
//         const rsiData = data["Technical Analysis: RSI"];
//         if (!rsiData || Object.keys(rsiData).length === 0) {
//             console.error("RSI block missing. Full response keys:", Object.keys(data));
//             throw new Error("RSI data not found - check symbol/interval/key/rate-limit");
//         }

//         // 4) Parse and return
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

import axios from "axios";

export interface RSISignal {
    time: string;
    rsi: number;
    signal: "BUY" | "SELL" | "NEUTRAL";
}

const API_KEY = process.env.ALPHA_VANTAGE_KEY || "BXX8DMFBRW3NNJQ1"; // temporary: move to env

function getSignalFromRSI(rsi: number): "BUY" | "SELL" | "NEUTRAL" {
    if (rsi < 40) return "BUY";
    if (rsi > 60) return "SELL";
    return "NEUTRAL";
}

export async function runRSIStrategy(
    symbol: string,
    interval: string = "15min",
    period: number = 14
): Promise<RSISignal[]> {
    try {
        // 🧹 Cleanup: remove "-" so BTC-USD -> BTCUSD (AlphaVantage format)
        const cleanSymbol = symbol.replace("-", "");

        const url = `https://www.alphavantage.co/query?function=RSI&symbol=${encodeURIComponent(
            cleanSymbol
        )}&interval=${encodeURIComponent(interval)}&time_period=${period}&series_type=close&apikey=${API_KEY}`;

        const { data } = await axios.get(url, { timeout: 10000 });

        console.log("AlphaVantage top-level keys:", Object.keys(data));

        const note = data?.Note || data?.["Error Message"] || data?.Information;
        if (note) {
            console.error("AlphaVantage returned a Note/Error:", note);
            throw new Error(`AlphaVantage message: ${note}`);
        }

        const rsiData = data["Technical Analysis: RSI"];
        if (!rsiData || Object.keys(rsiData).length === 0) {
            console.error("RSI block missing. Full response keys:", Object.keys(data));
            throw new Error("RSI data not found - check symbol/interval/key/rate-limit");
        }

        const parsed: RSISignal[] = Object.entries(rsiData)
            .map(([time, val]: any) => {
                const rsi = parseFloat(val.RSI);
                return {
                    time,
                    rsi: Number.isFinite(rsi) ? Number(rsi.toFixed(2)) : NaN,
                    signal: Number.isFinite(rsi) ? getSignalFromRSI(rsi) : "NEUTRAL",
                };
            })
            .reverse(); // oldest -> latest

        return parsed;
    } catch (err: any) {
        console.error("runRSIStrategy error:", err?.message ?? err);
        throw err;
    }
}
