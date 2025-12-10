import express from "express";
import { BotModel } from "../models/BotModel.js";
import { botManager } from "../Bot/botManager.js";
import {
  getBotPnl,
  getBotTrades,
} from "../controllers/botHistoryController.js";
import { incrementBotsCreated } from "../services/metricsService.js";

const router = express.Router();

/* ==========================
   ✅ CREATE NEW BOT
========================== */
router.post("/", async (req, res) => {
  try {
    // Save bot to DB
    const botDoc = await BotModel.create({
      name: req.body.name,
      userId: req.body.userId,
      configuration: req.body.configuration,
      exchange: req.body.exchange,
      symbol: req.body.symbol,
      quantity: req.body.configuration.quantity,
      brokerId: req.body.brokerId,
      timeframe: req.body.timeframe,
      rsiBuy: req.body.configuration.oversold,
      rsiSell: req.body.configuration.overbought,
      strategy_type: req.body.strategy_type,
      status: "running",
    });

    console.log("calling botManager.startBot now");

    // Start via botManager (NOT startTradingBot)
    await botManager.startBot(botDoc);

    // Update metric
    await incrementBotsCreated(1);

    return res.json({
      message: `Bot ${botDoc.name} created and started`,
      bot: botDoc,
    });
  } catch (err) {
    console.error("Error creating bot:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================
   ✅ STOP BOT BY ID
========================== */
router.post("/:id/stop", async (req, res) => {
  try {
    const { id } = req.params;

    await botManager.stopBot(id);
    await BotModel.findByIdAndUpdate(id, { status: "stopped" });

    return res.json({ message: `Bot ${id} stopped` });
  } catch (err) {
    console.error("Error stopping bot:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================
   ✅ TOGGLE BOT STATUS
========================== */
router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const botDoc = await BotModel.findById(id);
    if (!botDoc) return res.status(404).json({ error: "Bot not found" });

    if (status === "running") {
      await botManager.startBot(botDoc);
    } else if (status === "stopped") {
      await botManager.stopBot(id);
    }

    botDoc.status = status;
    await botDoc.save();

    return res.json({ message: `Bot ${botDoc.name} ${status}`, bot: botDoc });
  } catch (err) {
    console.error("Error toggling bot:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================
   ✅ GET BOT STATUS
========================== */
router.get("/:id/status", async (req, res) => {
  try {
    const bot = await BotModel.findById(req.params.id);
    if (!bot) return res.status(404).json({ error: "Bot not found" });

    const running = botManager.getActiveBotIds().includes(bot.id);

    return res.json({
      running,
      status: running ? "active" : bot.status,
    });
  } catch (err) {
    console.error("Error fetching bot status:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================
   ✅ GET ALL BOTS
========================== */
router.get("/", async (req, res) => {
  try {
    const bots = await BotModel.find({});
    const runningIds = botManager.getActiveBotIds();

    const botsWithStatus = bots.map((bot) => ({
      ...bot.toObject(),
      status: runningIds.includes(bot.id) ? "running" : bot.status,
    }));

    return res.json(botsWithStatus);
  } catch (err) {
    console.error("Error fetching all bots:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================
   ✅ DELETE BOT
========================== */
router.delete("/:id", async (req, res) => {
  try {
    const botDoc = await BotModel.findById(req.params.id);
    if (!botDoc) return res.json({ message: "Bot already deleted" });

    await botManager.stopBot(botDoc.id);
    await BotModel.findByIdAndDelete(botDoc.id);

    return res.json({ message: `Bot ${botDoc.name} deleted` });
  } catch (err) {
    console.error("Error deleting bot:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================
   ✅ GET BOT TRADES
   GET /api/bots/:id/trades
========================== */
router.get("/:id/trades", async (req, res) => {
  // delegate to controller
  return getBotTrades(req as any, res as any);
});

/* ==========================
   ✅ GET BOT PNL
   GET /api/bots/:id/pnl
========================== */
router.get("/:id/pnl", async (req, res) => {
  return getBotPnl(req as any, res as any);
});

export default router;
