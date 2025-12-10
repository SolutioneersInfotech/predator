import yahooFinance from "yahoo-finance2";

export async function getYahooIndicators(symbol: string) {
  try {
    const result = await yahooFinance.quoteSummary(symbol, {
      modules: ["summaryDetail", "price", "defaultKeyStatistics"],
    });

    const s = result?.summaryDetail;
    const p = result?.price;
    const k = result?.defaultKeyStatistics;

    return {
      price: p?.regularMarketPrice ?? null,
      high: p?.regularMarketDayHigh ?? null,
      low: p?.regularMarketDayLow ?? null,

      // Trend
      fiftyDayAverage: s?.fiftyDayAverage ?? null,
      twoHundredDayAverage: s?.twoHundredDayAverage ?? null,

      // Volatility
      beta: k?.beta ?? null,

      // Valuation
      marketCap: p?.marketCap ?? null,
      forwardPE: k?.forwardPE ?? null,
      profitMargins: k?.profitMargins ?? null,

      // Average Returns
      fiveYearAverageReturn: k?.fiveYearAverageReturn ?? null,
      ytdReturn: k?.ytdReturn ?? null

    };
  } catch (err: any) {
    console.error("Yahoo Indicators Error:", err.message);
    return null;
  }
}
