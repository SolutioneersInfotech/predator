
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


// import express from 'express';
// import { startTradingBot, stopTradingBot, getBotStatus, activeBots } from '../Bot/tradingBot.js';
// import { BotModel } from '../models/BotModel.js';
// import ExchangeCredential from '../models/ExchangeCredential.js';
// import * as CryptoUtils from '../utils/crypto.js'; // use namespace import and handle missing named export gracefully
// import type { BotConfig } from '../types/botTypes.js';

// const router = express.Router();

// /* ==========================
//    ✅ Helper: Fetch Decrypted Broker Credentials
// ========================== */
// async function getDecryptedCredentials(userId: string, exchange: string) {
//     const cred = await ExchangeCredential.findOne({ userId, exchange });
//     if (!cred) throw new Error(`No credentials found for exchange: ${exchange}`);

//     // Use the decrypt function if exported, otherwise fall back to identity (assume stored plaintext)
//     const decryptFn = (CryptoUtils as any).decrypt ?? ((v: string) => v);

//     const apiKey = decryptFn(cred.apiKey_enc);
//     const apiSecret = decryptFn(cred.apiSecret_enc);
//     const passphrase = cred.passphrase_enc ? decryptFn(cred.passphrase_enc) : undefined;

//     return { apiKey, apiSecret, passphrase };
// }

// /* ==========================
//    ✅ CREATE NEW BOT
// ========================== */
// router.post('/', async (req, res) => {
//     const config = req.body as BotConfig;

//     try {
//         const bot = new BotModel(config);
//         await bot.save();

//         const botObj = bot.toObject();
//         const allowedStrategies = ["RSI", "Custom"] as const;
//         const safeStrategy = allowedStrategies.includes(botObj.strategy_type as any)
//             ? (botObj.strategy_type as "RSI" | "Custom")
//             : "Custom";

//         // ✅ Fetch API credentials securely
//         const userId = (bot as any).userId ?? (botObj as any).userId;
//         const creds = await getDecryptedCredentials(userId, (botObj.broker_config as any)?.exchange);

//         const startConfig: BotConfig = {
//             name: botObj.name,
//             strategy_type: safeStrategy,
//             timeframe: botObj.timeframe ?? "1h",
//             configuration: {
//                 period: String(botObj.configuration?.period ?? "14"),
//                 oversold: String(botObj.configuration?.oversold ?? "30"),
//                 overbought: String(botObj.configuration?.overbought ?? "70"),
//                 pineScript: botObj.configuration?.pineScript ?? undefined,
//             },
//             broker_config: {
//                 apiKey: creds.apiKey,
//                 apiSecret: creds.apiSecret,
//                 apiEndpoint: botObj.broker_config?.apiEndpoint,
//             },
//             symbol: botObj.symbol ?? "BTC/USDT",
//         };

//         await startTradingBot(startConfig);

//         res.json({ message: `✅ Bot ${bot.name} started successfully`, bot });
//     } catch (err: any) {
//         console.error("Bot creation error:", err);
//         res.status(500).json({ error: err.message });
//     }
// });

// /* ==========================
//    ✅ TOGGLE BOT STATUS
// ========================== */
// router.put('/:id/status', async (req, res) => {
//     const { id } = req.params;
//     const { status } = req.body;

//     try {
//         const bot = await BotModel.findById(id);
//         if (!bot) return res.status(404).json({ error: 'Bot not found' });

//         if (status === 'active') {
//             const botObj = bot.toObject() as any;
//             const allowedStrategies = ["RSI", "Custom"] as const;
//             const safeStrategy = allowedStrategies.includes(botObj.strategy_type as any)
//                 ? (botObj.strategy_type as "RSI" | "Custom")
//                 : "Custom";

//             // ✅ Secure credential fetch (prefer document field, fall back to plain object)
//             const userId = (bot as any).userId ?? botObj.userId;
//             const creds = await getDecryptedCredentials(userId, (botObj.broker_config as any)?.exchange);

//             const startConfig: BotConfig = {
//                 name: botObj.name,
//                 strategy_type: safeStrategy,
//                 timeframe: botObj.timeframe ?? "1h",
//                 configuration: {
//                     period: String(botObj.configuration?.period ?? "14"),
//                     oversold: String(botObj.configuration?.oversold ?? "30"),
//                     overbought: String(botObj.configuration?.overbought ?? "70"),
//                     pineScript: botObj.configuration?.pineScript ?? undefined,
//                 },
//                 broker_config: {
//                     apiKey: creds.apiKey,
//                     apiSecret: creds.apiSecret,
//                     apiEndpoint: botObj.broker_config?.apiEndpoint,
//                 },
//                 symbol: botObj.symbol ?? "BTC/USDT",
//             };

//             await startTradingBot(startConfig);
//         } else if (status === 'stopped') {
//             stopTradingBot(bot.name);
//         }

//         bot.status = status;
//         await bot.save();

//         res.json({ message: `Bot ${bot.name} ${status}`, bot });
//     } catch (err: any) {
//         console.error("Toggle bot error:", err);
//         res.status(500).json({ error: err.message });
//     }
// });
// export default router;