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
