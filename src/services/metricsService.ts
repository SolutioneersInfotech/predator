import PlatformMetric from "../models/PlatformMetric.js";

// Ensure a singleton document exists
async function ensureDoc() {
  let doc = await PlatformMetric.findOne({});
  if (!doc) doc = await PlatformMetric.create({});
  return doc;
}

export async function incrementBotsCreated(n = 1) {
  return PlatformMetric.findOneAndUpdate(
    {},
    { $inc: { totalBotsCreated: n }, $set: { updatedAt: new Date() } },
    { upsert: true, new: true }
  );
}

export async function incrementTradesExecuted(n = 1) {
  return PlatformMetric.findOneAndUpdate(
    {},
    { $inc: { totalTradesExecuted: n }, $set: { updatedAt: new Date() } },
    { upsert: true, new: true }
  );
}

export async function addRealisedPnl(amount = 0) {
  if (!Number.isFinite(Number(amount)) || amount === 0) return;

  return PlatformMetric.findOneAndUpdate(
    {},
    { $inc: { totalRealisedPnl: Number(amount) }, $set: { updatedAt: new Date() } },
    { upsert: true, new: true }
  );
}

// NEW — Winning Trades
export async function incrementWinningTrade() {
  return PlatformMetric.findOneAndUpdate(
    {},
    { $inc: { totalWinningTrades: 1 }, $set: { updatedAt: new Date() } },
    { upsert: true, new: true }
  );
}

// NEW — Losing Trades
export async function incrementLosingTrade() {
  return PlatformMetric.findOneAndUpdate(
    {},
    { $inc: { totalLosingTrades: 1 }, $set: { updatedAt: new Date() } },
    { upsert: true, new: true }
  );
}
