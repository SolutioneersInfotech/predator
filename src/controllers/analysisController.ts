import type { Request, Response } from "express";
import { computeSignals, summarizeOverall } from "../services/signalEngine.js";
import { getNewsSummary } from "../services/newsService.js";

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
    const limit = Number(req.query.limit ?? 500);
    const results = await computeSignals(symbol, timeframes, limit);

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
    const maxItems = Number(req.query.maxItems ?? 10);

    const summary = await getNewsSummary(symbol, timeWindowHours, maxItems);
    res.json(summary);
  } catch (error) {
    console.error("News endpoint error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch news." });
  }
}
