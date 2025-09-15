

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
        let cleanSymbol = symbol.replace("-", "");
        if (cleanSymbol.endsWith("T")) {
            cleanSymbol = cleanSymbol.slice(0, -1);
        }

        // ✅ convert 1d → daily, 1w → weekly, 1m → monthly
        const intervalMap: Record<string, string> = {
            "1d": "daily",
            "1w": "weekly",
            "1m": "monthly"
        };
        const apiInterval = intervalMap[interval] || interval;

        console.log(`Running RSI for ${cleanSymbol} at ${apiInterval}`);

        const url = `https://www.alphavantage.co/query?function=RSI&symbol=${encodeURIComponent(
            cleanSymbol
        )}&interval=${encodeURIComponent(apiInterval)}&time_period=${period}&series_type=close&apikey=${API_KEY}`;

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
