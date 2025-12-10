import { detectMarketType } from "../utils/marketType.js";
import { getCryptoIndicators } from "../services/cryptoIndicators.js";
import { getYahooIndicators } from "../services/yahooIndicators.js";

export async function getIndicators(req, res) {
  try {
    let { symbol } = req.params;
    symbol = decodeURIComponent(symbol);

    const type = detectMarketType(symbol);

    console.log("debug icts =>>>>>>>> typemarket = ",type);

    if (type === "crypto") {
    //   const s = symbol.replace("-", "/").replace("", "");
    //   const [base, quote] = s.split(/[/ -]/);

      const indicators = await getCryptoIndicators(symbol);
      return res.json({
      success: true,
      symbol,
      indicators: indicators,
    });
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
