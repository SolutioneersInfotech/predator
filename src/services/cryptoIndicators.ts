import axios from "axios";
import { splitCryptoPair } from "../utils/marketType.js";
import dayjs from "dayjs";
import { computeRSI, fetchRSI, fetchRSI1W, fetchRSI4H } from "../utils/rsiHelper.js";
import { fetchCandlesFromBinance, type Candle } from "./fetchCandles.js";
import { computeSMASeries, computeEMASeries, computeBollingerBands, computeMACDSeries, computeRSISeries } from "../utils/indicatorTechnicalCalculation.js";

// ---------- (SMA computation snippet already there) ----------
function computeSMA(values: number[], period = 50) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

type Params = {
  limit?: number;
  smaPeriod?: number;
  emaPeriod?: number;
  bbPeriod?: number;
  bbStd?: number;
  rsiPeriod?: number;
};

export async function getIndicatorSeries(
  symbol: string,
  interval = "1d",
  requestedSeries: string[] = [],
  params: Params = {}
) {
  // apply defaults
  const {
    limit = 500,
    smaPeriod = 50,
    emaPeriod = 20,
    bbPeriod = 20,
    bbStd = 2,
    rsiPeriod = 14,
  } = params;

  // fetch candles using the requested limit
  const candles: Candle[] = await fetchCandlesFromBinance(symbol, interval, limit);

  const timestamps = candles.map((c) => c.time);
  const closes = candles.map((c) => c.close);

  const out: any = { timestamps, candles };

  // compute only requested series (allow both "sma" and "sma50" etc)
  if (requestedSeries.includes("sma") || requestedSeries.includes("sma50")) {
    out.sma = computeSMASeries(closes, smaPeriod);
  }
  if (requestedSeries.includes("ema") || requestedSeries.includes("ema20")) {
    out.ema = computeEMASeries(closes, emaPeriod);
    console.log("Out.ema ==============================================>>>>>>>>>>>",out.ema);
  }
  if (requestedSeries.includes("bbands")) {
    out.bb = computeBollingerBands(closes, bbPeriod, bbStd);
  }
  if (requestedSeries.includes("macd")) {
    out.macd = computeMACDSeries(closes);
  }
  if (requestedSeries.includes("rsi")) {
    out.rsi = computeRSISeries(closes, rsiPeriod);
  }

  return out;
}


function computeMACD(closes: number[]) {
  if (closes.length < 50) return null;

  const EMA = (period: number) => {
    const k = 2 / (period + 1);
    let ema = closes[0];
    for (let i = 1; i < closes.length; i++) {
      ema = closes[i] * k + ema * (1 - k);
    }
    return ema;
  };

  const ema12 = EMA(12);
  const ema26 = EMA(26);
  return ema12 - ema26;
}

// --------------------------------------
// Fetch Market Stats from Coingecko
// --------------------------------------

const COINGECKO_MAP: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  xrp: "ripple",
  ada: "cardano",
  doge: "dogecoin",
  dot: "polkadot",
  ltc: "litecoin",
  bnb: "binancecoin",
  shib: "shiba-inu",
};

// --------------------------------------
// GET PRICE ON SPECIFIC DATE (for YTD)
// --------------------------------------

async function getPriceOnDate(id: string, date: string) {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${id}/history?date=${date}&localization=false`;

    console.log("📅 Fetching historical price:", url);

    const res = await axios.get(url, { timeout: 15000 });
    const price = res.data?.market_data?.current_price?.usd;

    console.log("📅 Jan 1 Price:", price);

    return price ?? null;
  } catch (err: any) {
    console.log("❌ Error fetching historical price:", err.response?.data);
    return null;
  }
}

export async function getCryptoMarketStats(symbol: string) {
  const raw = symbol;
  const sym = symbol.toLowerCase().replace("usdt", "").replace("usd", "");

  console.log("🔍 RAW SYMBOL RECEIVED:", raw);
  console.log("🔍 NORMALIZED SYMBOL:", sym);

  const id = COINGECKO_MAP[sym];

  if (!id) {
    console.error("❌ No mapping found for:", sym);
    return {
      marketCap: null,
      price: null,
      high24h: null,
      low24h: null,
      ytdReturn: null,
      fiveYearReturn: null,
    };
  }

  const url = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&market_data=true`;

  console.log("🌐 Calling CoinGecko URL:", url);
  console.log("🪪 Using mapped ID:", id);

  try {
    const res = await axios.get(url, { timeout: 15000 });

    console.log("✅ CoinGecko response received, status:", res.status);

    const d = res.data.market_data;

    console.log("📊 Market data preview:", {
      price: d.current_price?.usd,
      marketCap: d.market_cap?.usd,
      high24h: d.high_24h?.usd,
      low24h: d.low_24h?.usd,
    });

    // ---- YTD RETURN CALCULATION ----
    const currentYear = dayjs().year();
    const jan1Formatted = dayjs(`${currentYear}-01-01`).format("DD-MM-YYYY");

    console.log("📅 Jan 1 Date String:", jan1Formatted);

    const jan1Price = await getPriceOnDate(id, jan1Formatted);

    let ytdReturn = null;
    if (jan1Price && d.current_price?.usd) {
      ytdReturn =
        ((d.current_price.usd - jan1Price) / jan1Price) * 100;
    }

    return {
      marketCap: d.market_cap?.usd ?? null,
      price: d.current_price?.usd ?? null,
      high24h: d.high_24h?.usd ?? null,
      low24h: d.low_24h?.usd ?? null,
      twoHundredDaysReturn: d.price_change_percentage_200d ?? null,
      oneYearReturn: d.price_change_percentage_1y ?? null,
      ytdReturn: ytdReturn ?? null
    };
  } catch (err: any) {
    console.error("❌ Error (coingecko) fetching crypto stats:");
    console.error("▶ ERROR MESSAGE:", err.message);
    console.error("▶ RESPONSE DATA:", err.response?.data);
    console.error("▶ STATUS CODE:", err.response?.status);

    return {
      marketCap: null,
      price: null,
      high24h: null,
      low24h: null,
      ytdReturn: null,
      fiveYearReturn: null,
    };
  }
}




// --------------------------------------
// Combined Indicator Function
// --------------------------------------
export async function getCryptoIndicators(symbol: string) {
  const { base, quote } = splitCryptoPair(symbol);

  // -------- 1. Fetch OHLC from CryptoCompare --------
  const url = `https://min-api.cryptocompare.com/data/v2/histohour?fsym=${base}&tsym=${quote}&limit=200`;

  let candles = [];
  try {
    const res = await axios.get(url);
    candles = res.data.Data.Data;
  } catch {
    console.error("Error fetching candles");
  }

  const closes = candles.map((c: any) => c.close);

  // -------- 2. Compute Technical Indicators --------
  const rsi1h = computeRSI(closes);
  const sma50 = computeSMA(closes);
  const macd = computeMACD(closes);

  // ---- Additional Timeframe RSIs ----
  const rsi1d = await fetchRSI(base, quote, "day");     // 1 Day RSI
  const rsi4h = await fetchRSI4H(base, quote);   // 4 Hour RSI
  const rsi1w = await fetchRSI1W(base, quote); 

  // -------- 3. Fetch Market Stats --------
  const market = await getCryptoMarketStats(base);

  // Final Combined Response
  return {
    rsi1h,
    rsi4h,
    rsi1d,
    rsi1w,
    sma50,
    macd,
    ...market,
  };
}
