// import express from "express";
// import { BotModel } from "../models/BotModel.js";
// import { botManager } from "../Bot/botManager.js";
// import {
//   getBotPnl,
//   getBotTrades,
// } from "../controllers/botHistoryController.js";
// import { incrementBotsCreated } from "../services/metricsService.js";

// const router = express.Router();

// /* ==========================
//    ✅ CREATE NEW BOT
// ========================== */
// router.post("/", async (req, res) => {
//   try {
//     // Save bot to DB
//     const botDoc = await BotModel.create({
//       name: req.body.name,
//       userId: req.body.userId,
//       configuration: req.body.configuration,
//       exchange: req.body.exchange,
//       symbol: req.body.symbol,
//       quantity: req.body.configuration.quantity,
//       brokerId: req.body.brokerId,
//       timeframe: req.body.timeframe,
//       rsiBuy: req.body.configuration.oversold,
//       rsiSell: req.body.configuration.overbought,
//       strategy_type: req.body.strategy_type,
//       status: "running",
//     });

//     console.log("calling botManager.startBot now");

//     // Start via botManager (NOT startTradingBot)
//     await botManager.startBot(botDoc);

//     // Update metric
//     await incrementBotsCreated(1);

//     return res.json({
//       message: `Bot ${botDoc.name} created and started`,
//       bot: botDoc,
//     });
//   } catch (err) {
//     console.error("Error creating bot:", err);
//     return res.status(500).json({ error: err.message });
//   }
// });

// /* ==========================
//    ✅ STOP BOT BY ID
// ========================== */
// router.post("/:id/stop", async (req, res) => {
//   try {
//     const { id } = req.params;

//     await botManager.stopBot(id);
//     await BotModel.findByIdAndUpdate(id, { status: "stopped" });

//     return res.json({ message: `Bot ${id} stopped` });
//   } catch (err) {
//     console.error("Error stopping bot:", err);
//     return res.status(500).json({ error: err.message });
//   }
// });

// /* ==========================
//    ✅ TOGGLE BOT STATUS
// ========================== */
// router.put("/:id/status", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;

//     const botDoc = await BotModel.findById(id);
//     if (!botDoc) return res.status(404).json({ error: "Bot not found" });

//     if (status === "running") {
//       await botManager.startBot(botDoc);
//     } else if (status === "stopped") {
//       await botManager.stopBot(id);
//     }

//     botDoc.status = status;
//     await botDoc.save();

//     return res.json({ message: `Bot ${botDoc.name} ${status}`, bot: botDoc });
//   } catch (err) {
//     console.error("Error toggling bot:", err);
//     return res.status(500).json({ error: err.message });
//   }
// });

// /* ==========================
//    ✅ GET BOT STATUS
// ========================== */
// router.get("/:id/status", async (req, res) => {
//   try {
//     const bot = await BotModel.findById(req.params.id);
//     if (!bot) return res.status(404).json({ error: "Bot not found" });

//     const running = botManager.getActiveBotIds().includes(bot.id);

//     return res.json({
//       running,
//       status: running ? "active" : bot.status,
//     });
//   } catch (err) {
//     console.error("Error fetching bot status:", err);
//     return res.status(500).json({ error: err.message });
//   }
// });

// /* ==========================
//    ✅ GET ALL BOTS
// ========================== */
// router.get("/", async (req, res) => {
//   try {
//     const bots = await BotModel.find({});
//     const runningIds = botManager.getActiveBotIds();

//     const botsWithStatus = bots.map((bot) => ({
//       ...bot.toObject(),
//       status: runningIds.includes(bot.id) ? "running" : bot.status,
//     }));

//     return res.json(botsWithStatus);
//   } catch (err) {
//     console.error("Error fetching all bots:", err);
//     return res.status(500).json({ error: err.message });
//   }
// });

// /* ==========================
//    ✅ DELETE BOT
// ========================== */
// router.delete("/:id", async (req, res) => {
//   try {
//     const botDoc = await BotModel.findById(req.params.id);
//     if (!botDoc) return res.json({ message: "Bot already deleted" });

//     await botManager.stopBot(botDoc.id);
//     await BotModel.findByIdAndDelete(botDoc.id);

//     return res.json({ message: `Bot ${botDoc.name} deleted` });
//   } catch (err) {
//     console.error("Error deleting bot:", err);
//     return res.status(500).json({ error: err.message });
//   }
// });

// /* ==========================
//    ✅ GET BOT TRADES
//    GET /api/bots/:id/trades
// ========================== */
// router.get("/:id/trades", async (req, res) => {
//   // delegate to controller
//   return getBotTrades(req as any, res as any);
// });

// /* ==========================
//    ✅ GET BOT PNL
//    GET /api/bots/:id/pnl
// ========================== */
// router.get("/:id/pnl", async (req, res) => {
//   return getBotPnl(req as any, res as any);
// });

// export default router;


import express from "express";
import { BotModel } from "../models/BotModel.js";
import { botManager } from "../Bot/botManager.js";
import {
  getBotPnl,
  getBotTrades,
} from "../controllers/botHistoryController.js";
import { incrementBotsCreated } from "../services/metricsService.js";
import { verifyAuth } from "../middlewares/authMiddleware.js";
import type { AuthRequest } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ==========================
   ✅ CREATE NEW BOT (JWT)
========================== */
router.post("/", verifyAuth("Bitbot1"), async (req: AuthRequest, res) => {
  try {
    const authId = req.user?.authId;
    if (!authId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const botDoc = await BotModel.create({
      name: req.body.name,
      authId, // 🔥 JWT based
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

    await botManager.startBot(botDoc);
    await incrementBotsCreated(1);

    return res.json({
      message: `Bot ${botDoc.name} created and started`,
      bot: botDoc,
    });
  } catch (err: any) {
    console.error("Error creating bot:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================
   ✅ STOP BOT (OWNER ONLY)
========================== */
router.post("/:id/stop", verifyAuth("Bitbot1"), async (req: AuthRequest, res) => {
  try {
    const authId = req.user?.authId;
    const { id } = req.params;

    const bot = await BotModel.findOne({ _id: id, authId });
    if (!bot) return res.status(404).json({ error: "Bot not found" });

    await botManager.stopBot(id);
    bot.status = "stopped";
    await bot.save();

    return res.json({ message: `Bot ${id} stopped` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================
   ✅ TOGGLE BOT STATUS
========================== */
router.put("/:id/status", verifyAuth("Bitbot1"), async (req: AuthRequest, res) => {
  try {
    const authId = req.user?.authId;
    const { id } = req.params;
    const { status } = req.body;

    const botDoc = await BotModel.findOne({ _id: id, authId });
    if (!botDoc) return res.status(404).json({ error: "Bot not found" });

    if (status === "running") {
      await botManager.startBot(botDoc);
    } else if (status === "stopped") {
      await botManager.stopBot(id);
    }

    botDoc.status = status;
    await botDoc.save();

    return res.json({ message: `Bot ${botDoc.name} ${status}`, bot: botDoc });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================
   ✅ GET ALL BOTS (USER ONLY)
========================== */
router.get("/", verifyAuth("Bitbot1"), async (req: AuthRequest, res) => {
  try {
    const authId = req.user?.authId;
    if (!authId) return res.status(401).json({ error: "Unauthorized" });

    const bots = await BotModel.find({ authId });
    const runningIds = botManager.getActiveBotIds();

    const botsWithStatus = bots.map((bot) => ({
      ...bot.toObject(),
      status: runningIds.includes(bot.id) ? "running" : bot.status,
    }));

    return res.json(botsWithStatus);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================
   ✅ DELETE BOT (OWNER ONLY)
========================== */
router.delete("/:id", verifyAuth("Bitbot1"), async (req: AuthRequest, res) => {
  try {
    const authId = req.user?.authId;
    const { id } = req.params;

    const botDoc = await BotModel.findOne({ _id: id, authId });
    if (!botDoc) return res.json({ message: "Bot already deleted" });

    await botManager.stopBot(botDoc.id);
    await BotModel.findByIdAndDelete(botDoc.id);

    return res.json({ message: `Bot ${botDoc.name} deleted` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================
   ✅ GET BOT TRADES
========================== */
router.get("/:id/trades", verifyAuth("Bitbot1"), (req, res) => {
  return getBotTrades(req as any, res as any);
});

/* ==========================
   ✅ GET BOT PNL
========================== */
router.get("/:id/pnl", verifyAuth("Bitbot1"), (req, res) => {
  return getBotPnl(req as any, res as any);
});

export default router;
