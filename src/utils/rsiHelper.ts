import axios from "axios";

// --------------------------------------
// LOCAL RSI CALCULATION
// --------------------------------------

export function computeRSI(closes: number[], period = 14) {
  if (closes.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// --------------------------------------
// FETCH RSI FOR SUPPORTED INTERVALS
// --------------------------------------

export async function fetchRSI(base: string, quote: string, interval: string, limit = 200) {
  let endpoint = "";

  if (interval === "hour") endpoint = "histohour";
  else if (interval === "day") endpoint = "histoday";
  else if (interval === "minute") endpoint = "histominute";
  else {
    console.error(`❌ Unsupported interval for fetchRSI: ${interval}`);
    return null;
  }

  const url = `https://min-api.cryptocompare.com/data/v2/${endpoint}?fsym=${base}&tsym=${quote}&limit=${limit}`;

  try {
    const res = await axios.get(url);
    const candles = res.data?.Data?.Data ?? [];
    if (!candles.length) return null;

    const closes = candles.map((c: any) => c.close);

    return computeRSI(closes);
  } catch (err: any) {
    console.error(`❌ Failed to fetch RSI (${interval}):`, err.response?.data || err.message);
    return null;
  }
}

// --------------------------------------
// 🔹 4-HOUR RSI (built from 1H candles)
// --------------------------------------

export function build4hClosesFrom1h(closes: number[]) {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i += 4) {
    result.push(closes[i + 3] ?? closes[i]); 
  }
  return result;
}

export async function fetchRSI4H(base: string, quote: string) {
  try {
    const url = `https://min-api.cryptocompare.com/data/v2/histohour?fsym=${base}&tsym=${quote}&limit=300`;
    const res = await axios.get(url);

    const candles = res.data?.Data?.Data ?? [];
    if (!candles.length) return null;

    const closes1h = candles.map((c: any) => c.close);

    const closes4h = build4hClosesFrom1h(closes1h);

    return computeRSI(closes4h);
  } catch (err: any) {
    console.error("❌ Failed to compute 4H RSI:", err.response?.data || err.message);
    return null;
  }
}

// --------------------------------------
// 🔹 WEEKLY RSI (your logic integrated)
// --------------------------------------

export async function fetchRSI1W(base: string, quote: string) {
  let weeklyCloses: number[] = [];

  try {
    const dailyRes = await axios.get(
      `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${base}&tsym=${quote}&limit=400`
    );

    const dailyCandles = dailyRes.data?.Data?.Data || [];

    // Every 7th daily close becomes a weekly close
    weeklyCloses = dailyCandles
      .filter((_, idx) => idx % 7 === 0)
      .map((c: any) => c.close);

  } catch (err) {
    console.error("❌ Could not fetch weekly data:", err.response?.data || err.message);
  }

  const rsi1wComputed =
    weeklyCloses.length > 14 ? computeRSI(weeklyCloses) : null;

  return rsi1wComputed;
}
