import axios from "axios";

export type Candle = {
    time: number; // epoch ms
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
};

/**
 * Fetch candles from Binance public API.
 * symbol: exchange symbol like 'BTCUSDT' or 'ETHUSDT' etc.
 * interval: '1m','5m','15m','1h','4h','1d' etc.
 */
export async function fetchCandlesFromBinance(symbol: string, interval = "1d", limit = 500): Promise<Candle[]> {

    const params = new URLSearchParams({ symbol, interval, limit: String(limit) });
    const url = `https://api.binance.com/api/v3/klines?${params.toString()}`;
    const resp = await axios.get(url);
    if (!resp || !resp.data) throw new Error("Failed to fetch candles");
    const raw = resp.data;

    console.log("Raw candle data:", raw);

    return raw.map((r: any) => ({
        time: r[0],
        open: parseFloat(r[1]),
        high: parseFloat(r[2]),
        low: parseFloat(r[3]),
        close: parseFloat(r[4]),
        volume: parseFloat(r[5])
    }));
}
