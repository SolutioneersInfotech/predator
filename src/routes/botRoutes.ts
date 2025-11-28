
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

        // ✅ Prepare safe bot object for startTradingBot
        const botObj = bot.toObject();
        const allowedStrategies = ["RSI", "Custom"] as const;

        const safeStrategy =
            allowedStrategies.includes(botObj.strategy_type as any)
                ? (botObj.strategy_type as "RSI" | "Custom")
                : "Custom";

        // ✅ Normalize fields to satisfy BotConfig
        const { _id, __v, ...rest } = botObj as any;

        const normalizedConfiguration = {
            period: String(rest.configuration?.period ?? "14"),
            oversold: String(rest.configuration?.oversold ?? "30"),
            overbought: String(rest.configuration?.overbought ?? "70"),
            pineScript: rest.configuration?.pineScript ?? undefined,
        };

        const normalizedBrokerConfig = {
            apiKey: String(rest.broker_config?.apiKey ?? ""),
            apiSecret: String(rest.broker_config?.apiSecret ?? ""),
            apiEndpoint: rest.broker_config?.apiEndpoint ?? undefined,
        };

        const startConfig: BotConfig = {
            name: String(rest.name),
            strategy_type: safeStrategy,
            timeframe: String(rest.timeframe ?? "1h"),
            configuration: normalizedConfiguration,
            broker_config: normalizedBrokerConfig,
            symbol: rest.symbol ?? "BTC/USDT",
        };

        await startTradingBot(startConfig);

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
            // ✅ Prepare safe bot object
            const botObj = bot.toObject();
            const allowedStrategies = ["RSI", "Custom"] as const;

            const safeStrategy =
                allowedStrategies.includes(botObj.strategy_type as any)
                    ? (botObj.strategy_type as "RSI" | "Custom")
                    : "Custom";

            const { _id, __v, ...rest } = botObj as any;

            const normalizedConfiguration = {
                period: String(rest.configuration?.period ?? "14"),
                oversold: String(rest.configuration?.oversold ?? "30"),
                overbought: String(rest.configuration?.overbought ?? "70"),
                pineScript: rest.configuration?.pineScript ?? undefined,
            };

            const normalizedBrokerConfig = {
                apiKey: String(rest.broker_config?.apiKey ?? ""),
                apiSecret: String(rest.broker_config?.apiSecret ?? ""),
                apiEndpoint: rest.broker_config?.apiEndpoint ?? undefined,
            };

            const startConfig: BotConfig = {
                name: String(rest.name),
                strategy_type: safeStrategy,
                timeframe: String(rest.timeframe ?? "1h"),
                configuration: normalizedConfiguration,
                broker_config: normalizedBrokerConfig,
                symbol: rest.symbol ?? "BTC/USDT",
            };

            await startTradingBot(startConfig);
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