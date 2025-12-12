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
    let { symbol } = req.params;
    const interval = req.query.interval || "1d";
    const series = req.query.series?.split(",") || [];

    const params = {
      limit: parseInt(req.query.limit) || 500,
      smaPeriod: parseInt(req.query.smaPeriod) || 50,
      emaPeriod: parseInt(req.query.emaPeriod) || 50,
      bbPeriod: parseInt(req.query.bbPeriod) || 20,
      bbStd: parseFloat(req.query.bbStd) || 2,
      rsiPeriod: parseInt(req.query.rsiPeriod) || 14,
    };

    const data = await getIndicatorSeries(symbol, interval, series, params);

    return res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute series" });
  }
}

