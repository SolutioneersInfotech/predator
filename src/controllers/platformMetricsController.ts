import PlatformMetric from "../models/PlatformMetric.js";
import { BotModel } from "../models/BotModel.js";

export const getPlatformMetrics = async (req, res) => {
  try {
    const metrics = await PlatformMetric.findOne({}) || {
      totalBotsCreated: 0,
      totalTradesExecuted: 0,
      totalRealisedPnl: 0,
      totalWinningTrades: 0,
      totalLosingTrades: 0
    };

    // Active bots count
    const activeBots = await BotModel.countDocuments({ status: "active" });

    // Aggregate PnL of active bots
    const agg = await BotModel.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: null,
          totalRealised: { $sum: "$realisedPnl" },
          totalUnrealised: { $sum: "$unrealisedPnl" }
        }
      }
    ]);

    const activeBotsAggregatePnl =
      agg.length > 0
        ? agg[0].totalRealised + agg[0].totalUnrealised
        : 0;

    const wins = metrics.totalWinningTrades || 0;
    const losses = metrics.totalLosingTrades || 0;

    const winRate =
      wins + losses > 0 ? wins / (wins + losses) : 0;

    return res.json({
      activeBots,
      activeBotsAggregatePnl,
      pastPnl: metrics.totalRealisedPnl,
      lifetimeBots: metrics.totalBotsCreated,
      lifetimeTrades: metrics.totalTradesExecuted,
      totalWinningTrades: wins,
      totalLosingTrades: losses,
      winRate
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch platform metrics" });
  }
};
