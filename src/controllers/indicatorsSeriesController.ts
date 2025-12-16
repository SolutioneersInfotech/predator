// src/controllers/indicatorsController.ts
import { detectMarketType } from "../utils/marketType.js";
import { getCryptoIndicators, getIndicatorSeries } from "../services/cryptoIndicators.js"; // adjust export
import { getYahooIndicators } from "../services/yahooIndicators.js";

export async function getIndicators(req, res) {
  try {
    let { symbol } = req.params;
    symbol = decodeURIComponent(symbol);

    const type = detectMarketType(symbol);

    if (type === "crypto") {
      const indicators = await getCryptoIndicators(symbol);
      return res.json({ success: true, symbol, indicators });
    }

    // Stock / Commodity (Yahoo)
    const indicators = await getYahooIndicators(symbol);
    return res.json({
      success: true,
      symbol,
      indicators: indicators,
    });
  } catch (err) {
    console.error("Indicator fetch error:", err);
    res.status(500).json({ error: "Failed to fetch indicators" });
  }
}

// NEW: return timeseries for overlays
export async function getIndicatorSeriesHandler(req, res) {
  try {
    const { symbol } = req.params;
    const interval = req.query.interval || "1d";
    const rawSeries = req.query.series?.split(",") || [];

    // --------------------------------------------------
    // 1. DEFAULT PARAMS (SAFE FALLBACKS)
    // --------------------------------------------------
    const params = {
      limit: parseInt(req.query.limit) || 500,

      // SMA / EMA
      smaPeriod: req.query.smaPeriod ? parseInt(req.query.smaPeriod) : null,
      emaFast: req.query.emaFast ? parseInt(req.query.emaFast) : null,
      emaSlow: req.query.emaSlow ? parseInt(req.query.emaSlow) : null,

      // Bollinger Bands
      bbPeriod: parseInt(req.query.bbPeriod) || 20,
      bbStd: parseFloat(req.query.bbStd) || 2,

      // RSI / ADX / ATR
      rsiPeriod: parseInt(req.query.rsiPeriod) || 14,
      adxPeriod: parseInt(req.query.adxPeriod) || 14,
      atrPeriod: parseInt(req.query.atrPeriod) || 14,

      // MACD
      macdFast: parseInt(req.query.macdFast) || 12,
      macdSlow: parseInt(req.query.macdSlow) || 26,
      macdSignal: parseInt(req.query.macdSignal) || 9,
    };

    // --------------------------------------------------
    // 2. PARSE SERIES NAMES (sma50, ema20, etc.)
    // --------------------------------------------------
    const series = [];

    for (const s of rawSeries) {
      if (s.startsWith("sma")) {
        series.push("sma");
        if (!params.smaPeriod) {
          const p = parseInt(s.replace("sma", ""));
          if (!isNaN(p)) params.smaPeriod = p;
        }
      }
      else if (s.startsWith("ema")) {
        series.push("ema");
        const p = parseInt(s.replace("ema", ""));
        if (!isNaN(p) && !params.emaFast) {
          params.emaFast = p;
        }
      }
      else {
        series.push(s); // rsi, macd, bb, adx, atr
      }
    }

    // --------------------------------------------------
    // 3. FINAL SAFETY DEFAULTS
    // --------------------------------------------------
    if (!params.smaPeriod) params.smaPeriod = 50;
    if (!params.emaFast) params.emaFast = 20;
    if (!params.emaSlow) params.emaSlow = 50;

    // --------------------------------------------------
    // 4. COMPUTE INDICATORS
    // --------------------------------------------------
    const data = await getIndicatorSeries(symbol, interval, series, params);

    return res.json({
      success: true,
      meta: {
        symbol,
        interval,
        limit: params.limit,
        periods: {
          sma: params.smaPeriod,
          emaFast: params.emaFast,
          emaSlow: params.emaSlow,
          bbPeriod: params.bbPeriod,
          bbStd: params.bbStd,
          rsi: params.rsiPeriod,
          adx: params.adxPeriod,
          atr: params.atrPeriod,
          macd: [
            params.macdFast,
            params.macdSlow,
            params.macdSignal,
          ],
        },
      },
      data, // 👈 unchanged
    });

  } catch (err) {
    console.error("getIndicatorSeriesHandler error:", err);
    return res.status(500).json({ error: "Failed to compute series" });
  }
}


