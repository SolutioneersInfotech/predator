import type { Request, Response } from "express";
import { computeSignal, summarizeOverall, type TimeframeSignal } from "../services/signalEngine.js";
import { getNewsSummary } from "../services/newsService.js";
import { getMarketSummary } from "../services/marketSummaryService.js";
import { getKeyLevels as getKeyLevelsService } from "../services/keyLevelsService.js";
import { detectMarketType } from "../utils/marketType.js";

const DEFAULT_TIMEFRAMES = ["15m", "1h", "4h", "1d", "1w"];

function parseTimeframes(raw?: string): string[] {
  if (!raw) return DEFAULT_TIMEFRAMES;
  const items = raw.split(",").map((item) => item.trim()).filter(Boolean);
  return items.length > 0 ? items : DEFAULT_TIMEFRAMES;
}

export async function getSignals(req: Request, res: Response) {
  try {
    const { symbol } = req.params;
    const timeframes = parseTimeframes(req.query.timeframes as string | undefined);
    const rawLimit = Number(req.query.limit ?? 500);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 500;
    const market = req.query.market ? String(req.query.market) : detectMarketType(symbol);

    const results: TimeframeSignal[] = [];
    for (const tf of timeframes) {
      const signal = await computeSignal(symbol, tf, limit, market);
      results.push(signal);
    }

    const response = {
      success: true,
      symbol,
      asOf: new Date().toISOString(),
      timeframes: results,
      overall: summarizeOverall(results),
    };

    res.json(response);
  } catch (error) {
    console.error("Signals endpoint error:", error);
    res.status(500).json({ success: false, error: "Failed to compute signals." });
  }
}

export async function getNews(req: Request, res: Response) {
  try {
    const { symbol } = req.params;
    const timeWindowHours = Number(req.query.timeWindowHours ?? 48);
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 8);

    const summary = await getNewsSummary(symbol, { timeWindowHours, page, limit });
    res.json(summary);
  } catch (error) {
    console.error("News endpoint error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch news." });
  }
}

export async function getSummary(req: Request, res: Response) {
  try {
    const symbol = req.query.symbol ? String(req.query.symbol) : "";
    if (!symbol) {
      return res.status(400).json({ success: false, error: "Missing required symbol query param." });
    }

    const timeframe = req.query.timeframe ? String(req.query.timeframe) : undefined;
    const summary = await getMarketSummary(symbol, timeframe);
    return res.json(summary);
  } catch (error) {
    console.error("Summary endpoint error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch market summary." });
  }
}

export async function getKeyLevels(req: Request, res: Response) {
  try {
    const { symbol } = req.params;
    const timeframe = req.query.timeframe ? String(req.query.timeframe) : "1h";
    const rawLimit = Number(req.query.limit ?? 500);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 500;
    const marketQuery = req.query.market ? String(req.query.market) : detectMarketType(symbol);
    const market = marketQuery === "equity" ? "stock" : marketQuery;

    const keyLevels = await getKeyLevelsService(symbol, timeframe, limit, market);

    res.json({
      success: true,
      ...keyLevels,
    });
  } catch (error) {
    console.error("Key levels endpoint error:", error);
    res.status(500).json({ success: false, error: "Failed to compute key levels." });
  }
}
