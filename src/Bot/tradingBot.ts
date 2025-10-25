
import 'dotenv/config';
import ccxt, { Exchange } from 'ccxt';
import { RSI, EMA } from 'technicalindicators';
import Bottleneck from 'bottleneck';
import pino from 'pino';
import type { BotConfig } from '../types/botTypes.js';

const logger = pino({ level: 'info' });

interface RunningBot {
    stopSignal: boolean;
    loop: Promise<void> | null;
}

const activeBots: Record<string, RunningBot> = {};

// ✅ Create Exchange
async function createExchange(apiKey: string, apiSecret: string, apiEndpoint?: string): Promise<Exchange> {
    const exchangeId = (process.env.EXCHANGE || 'delta') as keyof typeof ccxt;
    const exchangeClass = ccxt[exchangeId];
    if (!exchangeClass) throw new Error(`Exchange not found: ${exchangeId}`);

    const exchangeOptions: any = {
        apiKey,
        secret: apiSecret,
        enableRateLimit: true,
        options: { adjustForTimeDifference: true },
    };

    if (apiEndpoint) {
        exchangeOptions.urls = {
            api: {
                public: apiEndpoint,
                private: apiEndpoint,
            },
        };
        console.log(`✅ Using custom endpoint from frontend: ${apiEndpoint}`);
    }

    return new (ccxt as any)[exchangeId](exchangeOptions) as Exchange;
}

// ✅ Start Trading Bot
export async function startTradingBot(config: BotConfig) {
    if (activeBots[config.name]) {
        logger.warn(`⚠️ Bot ${config.name} is already running.`);
        return;
    }

    const bot: RunningBot = { stopSignal: false, loop: null };
    activeBots[config.name] = bot;

    const { timeframe, strategy_type, configuration, broker_config, symbol } = config;

    const exchange = await createExchange(
        broker_config.apiKey,
        broker_config.apiSecret,
        broker_config.apiEndpoint
    );

    const limiter = new Bottleneck({ minTime: 300 });
    const tradingSymbol = symbol || 'BTC/USDT';
    const pollInterval = 15000;

    bot.loop = (async () => {
        logger.info(`🚀 Starting bot: ${config.name} (${strategy_type}) on ${tradingSymbol}`);
        let lastRsi: number | null = null;
        let position: any = null;

        while (!bot.stopSignal) {
            try {
                const ohlcv = await limiter.schedule(() =>
                    exchange.fetchOHLCV(tradingSymbol, timeframe, undefined, 200)
                );
                if (!ohlcv.length) continue;

                const closes = ohlcv.map(c => c[4]);
                const lastClose = closes[closes.length - 1];

                if (strategy_type === "RSI") {
                    const rsiPeriod = parseInt(configuration.period || "14");
                    const oversold = parseFloat(configuration.oversold || "30");
                    const overbought = parseFloat(configuration.overbought || "70");

                    const rsiArr = RSI.calculate({ period: rsiPeriod, values: closes });
                    const emaArr = EMA.calculate({ period: 50, values: closes });
                    if (!rsiArr.length) continue;

                    const currentRsi = rsiArr[rsiArr.length - 1];
                    const prevRsi = lastRsi;
                    lastRsi = currentRsi;
                    const currentEma = emaArr[emaArr.length - 1];

                    const bullish = lastClose > currentEma;
                    const oversoldCross = prevRsi !== null && prevRsi < oversold && currentRsi >= oversold;
                    const overboughtCross = prevRsi !== null && prevRsi > overbought && currentRsi <= overbought;

                    logger.info({ name: config.name, rsi: currentRsi, price: lastClose }, "📈 Tick");

                    if (!position && oversoldCross && bullish) {
                        logger.info(`${config.name}: 🟢 Buy signal detected`);
                        position = { side: "long", entry: lastClose };
                    }

                    if (position && position.side === "long" && overboughtCross) {
                        logger.info(`${config.name}: 🔴 Sell signal detected`);
                        position = null;
                    }
                }

            } catch (err) {
                logger.error({ err }, `❌ Error in bot ${config.name}`);
            }

            await new Promise(r => setTimeout(r, pollInterval));
        }

        logger.info(`🛑 Bot ${config.name} stopped.`);
    })();
}

// ✅ Stop bot
export function stopTradingBot(name: string) {
    const bot = activeBots[name];
    if (!bot) return false;

    bot.stopSignal = true;
    delete activeBots[name];
    logger.info(`🛑 Stop signal sent to bot: ${name}`);
    return true;
}

// ✅ Check status
export function getBotStatus(name: string) {
    return !!activeBots[name];
}

// ✅ Get all running bots
export function getAllRunningBots() {
    return Object.keys(activeBots);
}

// ✅ Export activeBots explicitly for routers
export { activeBots };


// import 'dotenv/config';
// import ccxt, { Exchange } from 'ccxt';
// import { RSI, EMA } from 'technicalindicators';
// import Bottleneck from 'bottleneck';
// import pino from 'pino';
// import mongoose from 'mongoose';
// import crypto from 'crypto';
// import ExchangeCredential from '../models/ExchangeCredential.js'; // ✅ your model
// import type { BotConfig } from '../types/botTypes.js';

// const logger = pino({ level: 'info' });

// interface RunningBot {
//     stopSignal: boolean;
//     loop: Promise<void> | null;
// }

// const activeBots: Record<string, RunningBot> = {};

// // ============================================================
// // 🔐 AES Decryption Helper
// // ============================================================
// const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes
// const IV_LENGTH = 16;

// function decrypt(text: string): string {
//     try {
//         const textParts = text.split(':');
//         const iv = Buffer.from(textParts.shift()!, 'hex');
//         const encryptedText = Buffer.from(textParts.join(':'), 'hex');
//         const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
//         let decrypted = decipher.update(encryptedText);
//         decrypted = Buffer.concat([decrypted, decipher.final()]);
//         return decrypted.toString();
//     } catch (err) {
//         console.error('❌ Error decrypting key:', err);
//         return '';
//     }
// }

// // ============================================================
// // ⚙️ Create Exchange (from DB Encrypted Credentials)
// // ============================================================
// async function createExchange(userId: string, exchangeName: string): Promise<Exchange> {
//     const cred = await ExchangeCredential.findOne({ userId, exchange: exchangeName });
//     if (!cred) throw new Error(`No credentials found for exchange "${exchangeName}"`);

//     const apiKey = decrypt(cred.apiKey_enc);
//     const apiSecret = decrypt(cred.apiSecret_enc);

//     if (!apiKey || !apiSecret) {
//         throw new Error('Failed to decrypt API credentials');
//     }

//     const exchangeId = exchangeName.toLowerCase() as keyof typeof ccxt;
//     const exchangeClass = ccxt[exchangeId];
//     if (!exchangeClass) throw new Error(`Exchange not supported: ${exchangeName}`);

//     const exchangeOptions: any = {
//         apiKey,
//         secret: apiSecret,
//         enableRateLimit: true,
//         options: { adjustForTimeDifference: true },
//     };

//     const apiEndpoint = (cred as any).apiEndpoint || (cred as any).api_endpoint;
//     if (apiEndpoint) {
//         exchangeOptions.urls = {
//             api: { public: apiEndpoint, private: apiEndpoint },
//         };
//         console.log(`✅ Using custom endpoint for ${exchangeName}: ${apiEndpoint}`);
//     }

//     console.log(`🔑 Credentials loaded for ${exchangeName} (User: ${userId})`);
//     return new (ccxt as any)[exchangeId](exchangeOptions) as Exchange;
// }

// // ============================================================
// // 🚀 Start Trading Bot
// // ============================================================
// export async function startTradingBot(config: BotConfig) {
//     if (activeBots[config.name]) {
//         logger.warn(`⚠️ Bot ${config.name} is already running.`);
//         return;
//     }

//     const bot: RunningBot = { stopSignal: false, loop: null };
//     activeBots[config.name] = bot;

//     const { timeframe, strategy_type, configuration, symbol } = config;

//     // ✅ Create Exchange from Encrypted Credentials
//     const userId = (config as any).userId as string | undefined;
//     const exchange = (config as any).exchange as string | undefined;
//     if (!userId) throw new Error('Bot config missing userId');
//     const exchangeClient = await createExchange(userId, exchange || 'delta');

//     const limiter = new Bottleneck({ minTime: 300 });
//     const tradingSymbol = symbol || 'BTC/USDT';
//     const pollInterval = 15000;

//     bot.loop = (async () => {
//         logger.info(`🚀 Starting bot: ${config.name} (${strategy_type}) on ${tradingSymbol}`);
//         let lastRsi: number | null = null;
//         let position: any = null;

//         while (!bot.stopSignal) {
//             try {
//                 const ohlcv = await limiter.schedule(() =>
//                     exchangeClient.fetchOHLCV(tradingSymbol, timeframe, undefined, 200)
//                 );

//                 if (!ohlcv.length) continue;

//                 const closes = ohlcv.map(c => c[4]);
//                 const lastClose = closes[closes.length - 1];

//                 if (strategy_type === "RSI") {
//                     const rsiPeriod = parseInt(configuration.period || "14");
//                     const oversold = parseFloat(configuration.oversold || "30");
//                     const overbought = parseFloat(configuration.overbought || "70");

//                     const rsiArr = RSI.calculate({ period: rsiPeriod, values: closes });
//                     const emaArr = EMA.calculate({ period: 50, values: closes });

//                     if (!rsiArr.length) continue;

//                     const currentRsi = rsiArr[rsiArr.length - 1];
//                     const prevRsi = lastRsi;
//                     lastRsi = currentRsi;
//                     const currentEma = emaArr[emaArr.length - 1];

//                     const bullish = lastClose > currentEma;
//                     const oversoldCross = prevRsi !== null && prevRsi < oversold && currentRsi >= oversold;
//                     const overboughtCross = prevRsi !== null && prevRsi > overbought && currentRsi <= overbought;

//                     logger.info({ name: config.name, rsi: currentRsi, price: lastClose }, "📈 Tick");

//                     if (!position && oversoldCross && bullish) {
//                         logger.info(`${config.name}: 🟢 Buy signal detected`);
//                         position = { side: "long", entry: lastClose };
//                     }

//                     if (position && position.side === "long" && overboughtCross) {
//                         logger.info(`${config.name}: 🔴 Sell signal detected`);
//                         position = null;
//                     }
//                 }

//             } catch (err) {
//                 logger.error({ err }, `❌ Error in bot ${config.name}`);
//             }

//             await new Promise(r => setTimeout(r, pollInterval));
//         }

//         logger.info(`🛑 Bot ${config.name} stopped.`);
//     })();
// }

// // ============================================================
// // ⏹ Stop Bot
// // ============================================================
// export function stopTradingBot(name: string) {
//     const bot = activeBots[name];
//     if (!bot) return false;

//     bot.stopSignal = true;
//     delete activeBots[name];
//     logger.info(`🛑 Stop signal sent to bot: ${name}`);
//     return true;
// }

// // ============================================================
// // 📊 Get Bot Status / Running Bots
// // ============================================================
// export function getBotStatus(name: string) {
//     return !!activeBots[name];
// }

// export function getAllRunningBots() {
//     return Object.keys(activeBots);
// }

// export { activeBots };
