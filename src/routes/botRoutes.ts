// import express from 'express';
// import { startTradingBot, stopTradingBot, getBotStatus, getAllRunningBots } from '../Bot/tradingBot.js';
// import type { BotConfig } from '../types/botTypes.js';

// const router = express.Router();

// router.post('/', async (req, res) => {
//     const config = req.body as BotConfig;
//     try {
//         await startTradingBot(config);
//         res.json({ message: `Bot ${config.name} started successfully` });
//     } catch (err: any) {
//         res.status(500).json({ error: err.message });
//     }
// });

// router.post('/:name/stop', (req, res) => {
//     const { name } = req.params;
//     const success = stopTradingBot(name);
//     res.json({ success, message: success ? `Bot ${name} stopped` : `Bot ${name} not running` });
// });

// router.get('/:name/status', (req, res) => {
//     const { name } = req.params;
//     res.json({ running: getBotStatus(name) });
// });

// router.get('/', (req, res) => {
//     res.json({ runningBots: getAllRunningBots() });
// });

// export default router;

// import express from 'express';
// import { startTradingBot, stopTradingBot, getBotStatus } from '../Bot/tradingBot.js';
// import { BotModel } from '../models/BotModel.js'; // MongoDB schema
// import type { BotConfig } from '../types/botTypes.js';

// const router = express.Router();

// // ✅ Create a new bot
// router.post('/', async (req, res) => {
//     const config = req.body as BotConfig;
//     try {
//         // Save bot to DB
//         const bot = new BotModel(config);
//         await bot.save();

//         // Start the bot in memory
//         await startTradingBot(bot.toObject());

//         res.json({ message: `Bot ${bot.name} started and saved successfully`, bot });
//     } catch (err: any) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // ✅ Stop a bot by name
// router.post('/:name/stop', async (req, res) => {
//     const { name } = req.params;
//     try {
//         const success = stopTradingBot(name);

//         // Update status in DB
//         await BotModel.findOneAndUpdate({ name }, { status: 'stopped' });

//         res.json({ success, message: success ? `Bot ${name} stopped` : `Bot ${name} not running` });
//     } catch (err: any) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // ✅ Get bot status by name
// router.get('/:name/status', async (req, res) => {
//     const { name } = req.params;
//     try {
//         const running = getBotStatus(name);
//         const bot = await BotModel.findOne({ name });
//         res.json({ running, status: bot?.status || 'stopped' });
//     } catch (err: any) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // ✅ Get all bots
// router.get('/', async (req, res) => {
//     try {
//         const bots = await BotModel.find({});

//         // Optionally mark running bots based on in-memory state
//         const runningNames = Object.keys(require('../Bot/tradingBot.js').activeBots || {});
//         const botsWithStatus = bots.map(bot => ({
//             ...bot.toObject(),
//             status: runningNames.includes(bot.name) ? 'active' : bot.status || 'stopped',
//         }));

//         res.json(botsWithStatus);
//     } catch (err: any) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // ✅ Delete a bot
// router.delete('/:id', async (req, res) => {
//     try {
//         const bot = await BotModel.findByIdAndDelete(req.params.id);
//         if (bot) stopTradingBot(bot.name);
//         res.json({ message: `Bot ${bot?.name} deleted` });
//     } catch (err: any) {
//         res.status(500).json({ error: err.message });
//     }
// });

// export default router;


// import express from 'express';
// import { startTradingBot, stopTradingBot, getBotStatus, activeBots } from '../Bot/tradingBot.js';
// import { BotModel } from '../models/BotModel.js';
// import type { BotConfig } from '../types/botTypes.js';

// const router = express.Router();

// // ✅ Create a new bot
// router.post('/', async (req, res) => {
//     const config = req.body as BotConfig;
//     try {
//         const bot = new BotModel(config);
//         await bot.save();

//         await startTradingBot(bot.toObject());
//         res.json({ message: `Bot ${bot.name} started and saved successfully`, bot });
//     } catch (err: any) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // ✅ Stop a bot
// router.post('/:name/stop', async (req, res) => {
//     const { name } = req.params;
//     try {
//         const success = stopTradingBot(name);
//         await BotModel.findOneAndUpdate({ name }, { status: 'stopped' });
//         res.json({ success, message: success ? `Bot ${name} stopped` : `Bot ${name} not running` });
//     } catch (err: any) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // ✅ Get bot status
// router.get('/:name/status', async (req, res) => {
//     const { name } = req.params;
//     try {
//         const running = getBotStatus(name);
//         const bot = await BotModel.findOne({ name });
//         res.json({ running, status: bot?.status || 'stopped' });
//     } catch (err: any) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // ✅ Get all bots
// router.get('/', async (req, res) => {
//     try {
//         const bots = await BotModel.find({});
//         const runningNames = Object.keys(activeBots || {});
//         const botsWithStatus = bots.map(bot => ({
//             ...bot.toObject(),
//             status: runningNames.includes(bot.name) ? 'active' : bot.status || 'stopped',
//         }));

//         res.json(botsWithStatus);
//     } catch (err: any) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // ✅ Delete a bot
// router.delete('/:id', async (req, res) => {
//     try {
//         const bot = await BotModel.findByIdAndDelete(req.params.id);
//         if (bot) stopTradingBot(bot.name);
//         res.json({ message: `Bot ${bot?.name} deleted` });
//     } catch (err: any) {
//         res.status(500).json({ error: err.message });
//     }
// });

// export default router;


import express from 'express';
import { startTradingBot, stopTradingBot, getBotStatus, activeBots } from '../Bot/tradingBot.js';
import { BotModel } from '../models/BotModel.js';
import type { BotConfig } from '../types/botTypes.js';

const router = express.Router();

/* ==========================
   ✅ CREATE NEW BOT
========================== */
router.post('/', async (req, res) => {
    const config = req.body as BotConfig;
    try {
        const bot = new BotModel(config);
        await bot.save();

        await startTradingBot(bot.toObject());
        res.json({ message: `Bot ${bot.name} started and saved successfully`, bot });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/* ==========================
   ✅ STOP BOT BY NAME
========================== */
router.post('/:name/stop', async (req, res) => {
    const { name } = req.params;
    try {
        const success = stopTradingBot(name);
        await BotModel.findOneAndUpdate({ name }, { status: 'stopped' });
        res.json({ success, message: success ? `Bot ${name} stopped` : `Bot ${name} not running` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/* ==========================
   ✅ TOGGLE BOT STATUS (Frontend Toggle)
   Method: PUT /api/bots/:id/status
========================== */
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const bot = await BotModel.findById(id);
        if (!bot) return res.status(404).json({ error: 'Bot not found' });

        if (status === 'active') {
            await startTradingBot(bot.toObject());
        } else if (status === 'stopped') {
            stopTradingBot(bot.name);
        }

        bot.status = status;
        await bot.save();

        res.json({ message: `Bot ${bot.name} ${status}`, bot });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/* ==========================
   ✅ GET BOT STATUS BY NAME
========================== */
router.get('/:name/status', async (req, res) => {
    const { name } = req.params;
    try {
        const running = getBotStatus(name);
        const bot = await BotModel.findOne({ name });
        res.json({ running, status: bot?.status || 'stopped' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/* ==========================
   ✅ GET ALL BOTS
========================== */
router.get('/', async (req, res) => {
    try {
        const bots = await BotModel.find({});
        const runningNames = Object.keys(activeBots || {});
        const botsWithStatus = bots.map(bot => ({
            ...bot.toObject(),
            status: runningNames.includes(bot.name) ? 'active' : bot.status || 'stopped',
        }));

        res.json(botsWithStatus);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/* ==========================
   ✅ DELETE BOT
========================== */
router.delete('/:id', async (req, res) => {
    try {
        const bot = await BotModel.findByIdAndDelete(req.params.id);
        if (bot) stopTradingBot(bot.name);
        res.json({ message: `Bot ${bot?.name} deleted` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
