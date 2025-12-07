import type { Request, Response } from "express";
import TradeLog from "../models/TradeLog.js";
import { BotModel } from "../models/BotModel.js";
import { fetchCandlesFromBinance } from "../services/fetchCandles.js";

/**
 * GET /api/bots/:id/trades
 * Query: ?limit=50&page=1
 */
export const getBotTrades = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = Math.min(200, Number(req.query.limit ?? 50));
    const page = Math.max(1, Number(req.query.page ?? 1));
    const skip = (page - 1) * limit;

    const trades = await TradeLog.find({ botId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await TradeLog.countDocuments({ botId: id });

    res.json({ trades, meta: { total, page, limit } });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? err });
  }
};

/**
 * GET /api/bots/:id/pnl
 * Returns { realized, unrealized, total }
 */
export const getBotPnl = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bot = await BotModel.findById(id).lean();

    if (!bot) return res.status(404).json({ error: "Bot not found" });

    // realized PnL: sum of pnl fields in TradeLog (where pnl != null)
    const realizedAgg = await TradeLog.aggregate([
      { $match: { botId: id, pnl: { $ne: null } } },
      { $group: { _id: null, sum: { $sum: "$pnl" } } },
    ]);

    const realized = realizedAgg[0]?.sum ?? 0;

    // unrealized PnL: if bot.runtime.inPosition then compute using last price
    let unrealized = 0;
    if (bot.runtime?.inPosition && bot.runtime?.entryPrice) {
      const qty = Number(bot.configuration?.quantity ?? bot.quantity ?? 0);
      if (qty > 0) {
        // fetch latest price for symbol
        const fetchSymbol = (bot.symbol ?? "").replace("/", "").replace(/-PERP$/i, "");
        const candles = await fetchCandlesFromBinance(fetchSymbol, "1m", 1);
        const latestPrice = Number((candles?.[candles.length - 1]?.close) ?? 0);
        if (latestPrice > 0) {
          unrealized = (latestPrice - Number(bot.runtime.entryPrice)) * qty;
        }
      }
    }

    const total = realized + unrealized;

    res.json({ realized, unrealized, total });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? err });
  }
};
