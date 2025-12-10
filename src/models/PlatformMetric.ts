import mongoose from "mongoose";

const PlatformMetricSchema = new mongoose.Schema(
  {
    totalBotsCreated: { type: Number, default: 0 },
    totalTradesExecuted: { type: Number, default: 0 },
    totalRealisedPnl: { type: Number, default: 0 },

    // Win/Loss Tracking
    totalWinningTrades: { type: Number, default: 0 },
    totalLosingTrades: { type: Number, default: 0 },

    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("PlatformMetric", PlatformMetricSchema);
