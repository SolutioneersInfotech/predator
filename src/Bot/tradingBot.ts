//  main code


// import 'dotenv/config';
// import ccxt, { Exchange } from 'ccxt';
// import { RSI, EMA } from 'technicalindicators';
// import Bottleneck from 'bottleneck';
// import pino from 'pino';
// import type { BotConfig } from '../types/botTypes.js';

// const logger = pino({ level: 'info' });

// interface RunningBot {
//     stopSignal: boolean;
//     loop: Promise<void> | null;
// }

// const activeBots: Record<string, RunningBot> = {};

// // ✅ Create Exchange
// async function createExchange(apiKey: string, apiSecret: string, apiEndpoint?: string): Promise<Exchange> {
//     const exchangeId = (process.env.EXCHANGE || 'delta') as keyof typeof ccxt;
//     const exchangeClass = ccxt[exchangeId];
//     if (!exchangeClass) throw new Error(`Exchange not found: ${exchangeId}`);

//     const exchangeOptions: any = {
//         apiKey,
//         secret: apiSecret,
//         enableRateLimit: true,
//         options: { adjustForTimeDifference: true },
//     };

//     if (apiEndpoint) {
//         exchangeOptions.urls = {
//             api: {
//                 public: apiEndpoint,
//                 private: apiEndpoint,
//             },
//         };
//         console.log(`✅ Using custom endpoint from frontend: ${apiEndpoint}`);
//     }

//     return new (ccxt as any)[exchangeId](exchangeOptions) as Exchange;
// }

// // ✅ Start Trading Bot
// export async function startTradingBot(config: BotConfig) {
//     if (activeBots[config.name]) {
//         logger.warn(`⚠️ Bot ${config.name} is already running.`);
//         return;
//     }

//     const bot: RunningBot = { stopSignal: false, loop: null };
//     activeBots[config.name] = bot;

//     const { timeframe, strategy_type, configuration, broker_config, symbol } = config;

//     const exchange = await createExchange(
//         broker_config.apiKey,
//         broker_config.apiSecret,
//         broker_config.apiEndpoint
//     );

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
//                     exchange.fetchOHLCV(tradingSymbol, timeframe, undefined, 200)
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

// // ✅ Stop bot
// export function stopTradingBot(name: string) {
//     const bot = activeBots[name];
//     if (!bot) return false;

//     bot.stopSignal = true;
//     delete activeBots[name];
//     logger.info(`🛑 Stop signal sent to bot: ${name}`);
//     return true;
// }

// // ✅ Check status
// export function getBotStatus(name: string) {
//     return !!activeBots[name];
// }

// // ✅ Get all running bots
// export function getAllRunningBots() {
//     return Object.keys(activeBots);
// }

// // ✅ Export activeBots explicitly for routers
// export { activeBots };


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



// import 'dotenv/config';
// import ccxt, { Exchange } from 'ccxt';
// import { RSI, EMA } from 'technicalindicators';
// import Bottleneck from 'bottleneck';
// import pino from 'pino';
// import type { BotConfig } from '../types/botTypes.js';
// import { executeOrderForUser } from '../services/tradeExecutor.js'; // 🟢 Added for order execution

// const logger = pino({ level: 'info' });

// interface RunningBot {
//     stopSignal: boolean;
//     loop: Promise<void> | null;
// }

// const activeBots: Record<string, RunningBot> = {};

// // ✅ Create Exchange Instance
// async function createExchange(apiKey: string, apiSecret: string, apiEndpoint?: string): Promise<Exchange> {
//     const exchangeId = (process.env.EXCHANGE || 'delta') as keyof typeof ccxt;
//     const exchangeClass = ccxt[exchangeId];
//     if (!exchangeClass) throw new Error(`Exchange not found: ${exchangeId}`);

//     const exchangeOptions: any = {
//         apiKey,
//         secret: apiSecret,
//         enableRateLimit: true,
//         options: { adjustForTimeDifference: true },
//     };

//     if (apiEndpoint) {
//         exchangeOptions.urls = {
//             api: {
//                 public: apiEndpoint,
//                 private: apiEndpoint,
//             },
//         };
//         console.log(`✅ Using custom endpoint from frontend: ${apiEndpoint}`);
//     }

//     return new (ccxt as any)[exchangeId](exchangeOptions) as Exchange;
// }

// // ✅ Start Trading Bot
// export async function startTradingBot(config: BotConfig & { userId?: string }) {
//     if (activeBots[config.name]) {
//         logger.warn(`⚠️ Bot ${config.name} is already running.`);
//         return;
//     }

//     const bot: RunningBot = { stopSignal: false, loop: null };
//     activeBots[config.name] = bot;

//     const { timeframe, strategy_type, configuration, broker_config, symbol, userId } = config;

//     const exchange = await createExchange(
//         broker_config.apiKey,
//         broker_config.apiSecret,
//         broker_config.apiEndpoint
//     );

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
//                     exchange.fetchOHLCV(tradingSymbol, timeframe, undefined, 200)
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

//                     // 🟢 BUY SIGNAL
//                     if (!position && oversoldCross && bullish) {
//                         logger.info(`${config.name}: 🟢 Buy signal detected`);
//                         try {
//                             const result = await executeOrderForUser({
//                                 userId: userId || "unknown",
//                                 exchange: broker_config?.exchange || "delta",
//                                 symbol: tradingSymbol.replace("/", "-"),
//                                 side: "BUY",
//                                 quantity: 0.01,
//                                 type: "MARKET",
//                             });

//                             logger.info({ result }, "✅ BUY order executed");
//                             position = { side: "long", entry: lastClose };
//                         } catch (err) {
//                             logger.error({ err }, "❌ Failed to place BUY order");
//                         }
//                     }

//                     // 🔴 SELL SIGNAL
//                     if (position && position.side === "long" && overboughtCross) {
//                         logger.info(`${config.name}: 🔴 Sell signal detected`);
//                         try {
//                             const result = await executeOrderForUser({
//                                 userId: userId || "unknown",
//                                 exchange: broker_config?.exchange || "delta",
//                                 symbol: tradingSymbol.replace("/", "-"),
//                                 side: "SELL",
//                                 quantity: 0.01,
//                                 type: "MARKET",
//                             });

//                             logger.info({ result }, "✅ SELL order executed");
//                             position = null;
//                         } catch (err) {
//                             logger.error({ err }, "❌ Failed to place SELL order");
//                         }
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

// // ✅ Stop Bot
// export function stopTradingBot(name: string) {
//     const bot = activeBots[name];
//     if (!bot) return false;

//     bot.stopSignal = true;
//     delete activeBots[name];
//     logger.info(`🛑 Stop signal sent to bot: ${name}`);
//     return true;
// }

// // ✅ Check Bot Status
// export function getBotStatus(name: string) {
//     return !!activeBots[name];
// }

// // ✅ Get All Running Bots
// export function getAllRunningBots() {
//     return Object.keys(activeBots);
// }

// // ✅ Export activeBots
// export { activeBots };



// import 'dotenv/config';
// import ccxt, { Exchange } from 'ccxt';
// import { RSI, EMA } from 'technicalindicators';
// import Bottleneck from 'bottleneck';
// import pino from 'pino';
// import type { BotConfig } from '../types/botTypes.js';
// import { executeOrderForUser } from '../services/tradeExecutor.js'; // 🟢 Order Executor

// const logger = pino({ level: 'info' });

// interface RunningBot {
//     stopSignal: boolean;
//     loop: Promise<void> | null;
// }

// const activeBots: Record<string, RunningBot> = {};

// // ✅ Create Exchange Instance
// async function createExchange(apiKey: string, apiSecret: string, apiEndpoint?: string, exchangeName?: string): Promise<Exchange> {
//     const exchangeId = (exchangeName || process.env.EXCHANGE || 'delta').toLowerCase();
//     const exchangeClass = (ccxt as any)[exchangeId];
//     if (!exchangeClass) throw new Error(`Exchange not found: ${exchangeId}`);

//     const options: any = {
//         apiKey,
//         secret: apiSecret,
//         enableRateLimit: true,
//         options: { adjustForTimeDifference: true },
//     };

//     if (apiEndpoint) {
//         options.urls = {
//             api: { public: apiEndpoint, private: apiEndpoint },
//         };
//         console.log(`✅ Using custom endpoint for ${exchangeId}: ${apiEndpoint}`);
//     }

//     return new exchangeClass(options);
// }

// // ✅ Start Trading Bot
// export async function startTradingBot(config: BotConfig & { userId?: string }) {
//     if (activeBots[config.name]) {
//         logger.warn(`⚠️ Bot ${config.name} is already running.`);
//         return;
//     }

//     const bot: RunningBot = { stopSignal: false, loop: null };
//     activeBots[config.name] = bot;

//     const { timeframe, strategy_type, configuration, broker_config, symbol, userId } = config;

//     const exchangeName = (broker_config as any)?.exchange || process.env.EXCHANGE || 'delta';
//     const exchange = await createExchange(
//         broker_config.apiKey,
//         broker_config.apiSecret,
//         broker_config.apiEndpoint,
//         exchangeName
//     );

//     const limiter = new Bottleneck({ minTime: 300 });
//     const tradingSymbol = symbol || 'BTC/USDT';
//     const pollInterval = 15000; // 15 seconds

//     bot.loop = (async () => {
//         logger.info(`🚀 Starting bot: ${config.name} (${strategy_type}) on ${tradingSymbol}`);
//         let lastRsi: number | null = null;
//         let position: { side: 'long' | 'short'; entry: number } | null = null;
//         let lastSignal: 'buy' | 'sell' | null = null;

//         while (!bot.stopSignal) {
//             try {
//                 const ohlcv = await limiter.schedule(() =>
//                     exchange.fetchOHLCV(tradingSymbol, timeframe, undefined, 200)
//                 );
//                 if (!ohlcv.length) continue;

//                 const closes = ohlcv.map(c => c[4]);
//                 const lastClose = closes.at(-1)!;

//                 if (strategy_type === 'RSI') {
//                     const rsiPeriod = parseInt(configuration.period || '14');
//                     const oversold = parseFloat(configuration.oversold || '30');
//                     const overbought = parseFloat(configuration.overbought || '70');

//                     const rsiArr = RSI.calculate({ period: rsiPeriod, values: closes });
//                     const emaArr = EMA.calculate({ period: 50, values: closes });
//                     if (!rsiArr.length) continue;

//                     const currentRsi = rsiArr.at(-1)!;
//                     const prevRsi = lastRsi;
//                     lastRsi = currentRsi;
//                     const currentEma = emaArr.at(-1)!;

//                     const bullish = lastClose > currentEma;
//                     const oversoldCross = prevRsi !== null && prevRsi < oversold && currentRsi >= oversold;
//                     const overboughtCross = prevRsi !== null && prevRsi > overbought && currentRsi <= overbought;

//                     logger.info({ bot: config.name, rsi: currentRsi, price: lastClose }, '📊 RSI Tick');

//                     // 🟢 BUY SIGNAL
//                     if (!position && oversoldCross && bullish && lastSignal !== 'buy') {
//                         logger.info(`${config.name}: 🟢 Buy signal detected`);
//                         lastSignal = 'buy';
//                         try {
//                             const result = await executeOrderForUser({
//                                 userId: userId || 'unknown',
//                                 exchange: (broker_config as any)?.exchange || 'delta',
//                                 symbol: tradingSymbol,
//                                 side: 'BUY',
//                                 quantity: Number((configuration as any).quantity ?? 0.01),
//                                 type: 'MARKET',
//                             });

//                             logger.info({ result }, '✅ BUY order executed');
//                             position = { side: 'long', entry: lastClose };
//                         } catch (err) {
//                             logger.error({ err }, '❌ Failed to place BUY order');
//                         }
//                     }

//                     // 🔴 SELL SIGNAL
//                     if (position && position.side === 'long' && overboughtCross && lastSignal !== 'sell') {
//                         logger.info(`${config.name}: 🔴 Sell signal detected`);
//                         lastSignal = 'sell';
//                         try {
//                             const result = await executeOrderForUser({
//                                 userId: userId || 'unknown',
//                                 exchange: (broker_config as any)?.exchange || 'delta',
//                                 symbol: tradingSymbol,
//                                 side: 'SELL',
//                                 quantity: Number((configuration as any).quantity ?? 0.01),
//                                 type: 'MARKET',
//                             });

//                             logger.info({ result }, '✅ SELL order executed');
//                             position = null;
//                         } catch (err) {
//                             logger.error({ err }, '❌ Failed to place SELL order');
//                         }
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

// // ✅ Stop Bot
// export function stopTradingBot(name: string) {
//     const bot = activeBots[name];
//     if (!bot) return false;

//     bot.stopSignal = true;
//     delete activeBots[name];
//     logger.info(`🛑 Stop signal sent to bot: ${name}`);
//     return true;
// }

// // ✅ Check Bot Status
// export function getBotStatus(name: string) {
//     return !!activeBots[name];
// }

// // ✅ Get All Running Bots
// export function getAllRunningBots() {
//     return Object.keys(activeBots);
// }

// // ✅ Export activeBots
// export { activeBots };



// import 'dotenv/config';
// import ccxt, { Exchange } from 'ccxt';
// import { RSI, EMA } from 'technicalindicators';
// import Bottleneck from 'bottleneck';
// import pino from 'pino';
// import type { BotConfig } from '../types/botTypes.js';
// import { executeOrderForUser } from '../services/tradeExecutor.js'; // 🟢 Order Executor

// const logger = pino({ level: 'info' });

// interface RunningBot {
//     stopSignal: boolean;
//     loop: Promise<void> | null;
// }

// const activeBots: Record<string, RunningBot> = {};

// // ✅ Create Exchange Instance
// async function createExchange(apiKey: string, apiSecret: string, apiEndpoint?: string, exchangeName?: string): Promise<Exchange> {
//     const exchangeId = (exchangeName || process.env.EXCHANGE || 'delta').toLowerCase();
//     const exchangeClass = (ccxt as any)[exchangeId];
//     if (!exchangeClass) throw new Error(`Exchange not found: ${exchangeId}`);

//     const options: any = {
//         apiKey,
//         secret: apiSecret,
//         enableRateLimit: true,
//         options: { adjustForTimeDifference: true },
//     };

//     if (apiEndpoint) {
//         options.urls = {
//             api: { public: apiEndpoint, private: apiEndpoint },
//         };
//         logger.info(`✅ Using custom endpoint for ${exchangeId}: ${apiEndpoint}`);
//     }

//     const exchange = new exchangeClass(options);
//     logger.info(`🔗 Exchange instance created: ${exchangeId}`);
//     return exchange;
// }

// // ✅ Start Trading Bot
// export async function startTradingBot(config: BotConfig & { userId?: string }) {
//     if (activeBots[config.name]) {
//         logger.warn(`⚠️ Bot ${config.name} is already running.`);
//         return;
//     }

//     const bot: RunningBot = { stopSignal: false, loop: null };
//     activeBots[config.name] = bot;

//     const { timeframe, strategy_type, configuration, broker_config, symbol, userId } = config;

//     const exchangeName = (broker_config as any)?.exchange || process.env.EXCHANGE || 'delta';
//     const exchange = await createExchange(
//         broker_config.apiKey,
//         broker_config.apiSecret,
//         broker_config.apiEndpoint,
//         exchangeName
//     );

//     const limiter = new Bottleneck({ minTime: 300 });
//     const tradingSymbol = symbol || 'BTC/USDT';
//     const pollInterval = 15000; // 15 seconds

//     bot.loop = (async () => {
//         logger.info(`🚀 Starting bot: ${config.name}`);
//         logger.info(`⚙️ Config => Exchange: ${exchangeName}, Symbol: ${tradingSymbol}, Timeframe: ${timeframe}, Strategy: ${strategy_type}`);

//         let lastRsi: number | null = null;
//         let position: { side: 'long' | 'short'; entry: number } | null = null;
//         let lastSignal: 'buy' | 'sell' | null = null;

//         // Load markets and verify symbol
//         try {
//             await exchange.loadMarkets();
//             logger.info(`✅ Markets loaded from ${exchangeName}`);
//             if (!exchange.markets[tradingSymbol]) {
//                 logger.warn(`⚠️ Symbol ${tradingSymbol} not found. Trying BTC/USDT:USDT...`);
//             }
//         } catch (err) {
//             logger.error({ err }, '❌ Failed to load markets');
//         }

//         while (!bot.stopSignal) {
//             try {
//                 logger.info(`🔍 Fetching OHLCV for ${tradingSymbol} (${timeframe})`);
//                 const ohlcv = await limiter.schedule(() =>
//                     exchange.fetchOHLCV(tradingSymbol, timeframe, undefined, 200)
//                 );

//                 if (!ohlcv.length) {
//                     logger.warn(`⚠️ No OHLCV data received for ${tradingSymbol}`);
//                     continue;
//                 }

//                 const closes = ohlcv.map(c => c[4]);
//                 const lastClose = closes.at(-1)!;
//                 logger.info(`📈 Latest Close: ${lastClose}`);

//                 if (strategy_type === 'RSI') {
//                     const rsiPeriod = parseInt(configuration.period || '14');
//                     const oversold = parseFloat(configuration.oversold || '30');
//                     const overbought = parseFloat(configuration.overbought || '70');

//                     const rsiArr = RSI.calculate({ period: rsiPeriod, values: closes });
//                     const emaArr = EMA.calculate({ period: 50, values: closes });
//                     if (!rsiArr.length) continue;

//                     const currentRsi = rsiArr.at(-1)!;
//                     const prevRsi = lastRsi;
//                     lastRsi = currentRsi;
//                     const currentEma = emaArr.at(-1)!;

//                     const bullish = lastClose > currentEma;
//                     const oversoldCross = prevRsi !== null && prevRsi < oversold && currentRsi >= oversold;
//                     const overboughtCross = prevRsi !== null && prevRsi > overbought && currentRsi <= overbought;

//                     logger.info({ bot: config.name, rsi: currentRsi, ema: currentEma, price: lastClose }, '📊 RSI Tick');

//                     // 🟢 BUY SIGNAL
//                     if (!position && oversoldCross && bullish && lastSignal !== 'buy') {
//                         logger.info(`${config.name}: 🟢 Buy signal detected`);
//                         lastSignal = 'buy';
//                         try {
//                             logger.info(`🛒 Executing BUY order on ${tradingSymbol}`);
//                             const result = await executeOrderForUser({
//                                 userId: userId || 'unknown',
//                                 exchange: (broker_config as any)?.exchange || 'delta',
//                                 symbol: tradingSymbol,
//                                 side: 'BUY',
//                                 quantity: Number((configuration as any).quantity ?? 0.01),
//                                 type: 'MARKET',
//                             });

//                             logger.info({ result }, '✅ BUY order executed');
//                             position = { side: 'long', entry: lastClose };
//                         } catch (err) {
//                             logger.error({ err }, '❌ Failed to place BUY order');
//                         }
//                     }

//                     // 🔴 SELL SIGNAL
//                     if (position && position.side === 'long' && overboughtCross && lastSignal !== 'sell') {
//                         logger.info(`${config.name}: 🔴 Sell signal detected`);
//                         lastSignal = 'sell';
//                         try {
//                             logger.info(`💰 Executing SELL order on ${tradingSymbol}`);
//                             const result = await executeOrderForUser({
//                                 userId: userId || 'unknown',
//                                 exchange: (broker_config as any)?.exchange || 'delta',
//                                 symbol: tradingSymbol,
//                                 side: 'SELL',
//                                 quantity: Number((configuration as any).quantity ?? 0.01),
//                                 type: 'MARKET',
//                             });

//                             logger.info({ result }, '✅ SELL order executed');
//                             position = null;
//                         } catch (err) {
//                             logger.error({ err }, '❌ Failed to place SELL order');
//                         }
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

// // ✅ Stop Bot
// export function stopTradingBot(name: string) {
//     const bot = activeBots[name];
//     if (!bot) return false;

//     bot.stopSignal = true;
//     delete activeBots[name];
//     logger.info(`🛑 Stop signal sent to bot: ${name}`);
//     return true;
// }

// // ✅ Check Bot Status
// export function getBotStatus(name: string) {
//     return !!activeBots[name];
// }

// // ✅ Get All Running Bots
// export function getAllRunningBots() {
//     return Object.keys(activeBots);
// }

// // ✅ Export activeBots
// export { activeBots };


import 'dotenv/config';
import ccxt, { Exchange } from 'ccxt';
import { RSI, EMA } from 'technicalindicators';
import Bottleneck from 'bottleneck';
import pino from 'pino';
import type { BotConfig } from '../types/botTypes.js';
import { executeOrderForUser } from '../services/tradeExecutor.js';
import { fetchDeltaProducts, fetchDeltaOrderById } from '../exchanges/delta.js'; // ✅ Added for Delta

const logger = pino({ level: 'info' });

interface RunningBot {
    stopSignal: boolean;
    loop: Promise<void> | null;
}

const activeBots: Record<string, RunningBot> = {};

// ✅ Create Exchange Instance
async function createExchange(apiKey: string, apiSecret: string, apiEndpoint?: string, exchangeName?: string): Promise<Exchange> {
    const exchangeId = (exchangeName || process.env.EXCHANGE || 'delta').toLowerCase();
    const exchangeClass = (ccxt as any)[exchangeId];
    if (!exchangeClass) throw new Error(`Exchange not found: ${exchangeId}`);

    const options: any = {
        apiKey,
        secret: apiSecret,
        enableRateLimit: true,
        options: { adjustForTimeDifference: true },
    };

    if (apiEndpoint) {
        options.urls = { api: { public: apiEndpoint, private: apiEndpoint } };
    }

    const exchange = new exchangeClass(options);
    logger.info(`🔗 Exchange instance created: ${exchangeId}`);
    return exchange;
}

// ✅ Start Trading Bot
export async function startTradingBot(config: BotConfig & { userId?: string }) {
    if (activeBots[config.name]) {
        logger.warn(`⚠️ Bot ${config.name} is already running.`);
        return;
    }

    const bot: RunningBot = { stopSignal: false, loop: null };
    activeBots[config.name] = bot;

    const { timeframe, strategy_type, configuration, broker_config, symbol, userId } = config;
    const exchangeName = (broker_config as any)?.exchange || process.env.EXCHANGE || 'delta';
    const exchange = await createExchange(
        broker_config.apiKey,
        broker_config.apiSecret,
        broker_config.apiEndpoint,
        exchangeName
    );

    const limiter = new Bottleneck({ minTime: 300 });
    const tradingSymbol = symbol || 'BTC/USDT';
    const pollInterval = 15000; // 15s

    // 🟢 Fetch Delta products once
    let deltaProductMap: Record<string, number> = {};
    if (exchangeName === 'delta') {
        logger.info('📦 Loading Delta product list...');
        deltaProductMap = await fetchDeltaProducts();
        logger.info(`✅ Loaded ${Object.keys(deltaProductMap).length} products.`);
    }

    bot.loop = (async () => {
        logger.info(`🚀 Starting bot: ${config.name}`);

        let lastRsi: number | null = null;
        let position: { side: 'long' | 'short'; entry: number } | null = null;
        let lastSignal: 'buy' | 'sell' | null = null;

        await exchange.loadMarkets();

        while (!bot.stopSignal) {
            try {
                const ohlcv = await limiter.schedule(() =>
                    exchange.fetchOHLCV(tradingSymbol, timeframe, undefined, 200)
                );

                if (!ohlcv.length) continue;

                const closes = ohlcv.map(c => c[4]);
                const lastClose = closes.at(-1)!;

                const rsiPeriod = parseInt(configuration.period || '14');
                const oversold = parseFloat(configuration.oversold || '30');
                const overbought = parseFloat(configuration.overbought || '70');

                const rsiArr = RSI.calculate({ period: rsiPeriod, values: closes });
                const emaArr = EMA.calculate({ period: 50, values: closes });
                if (!rsiArr.length) continue;

                const currentRsi = rsiArr.at(-1)!;
                const prevRsi = lastRsi;
                lastRsi = currentRsi;
                const currentEma = emaArr.at(-1)!;

                const bullish = lastClose > currentEma;
                const oversoldCross = prevRsi !== null && prevRsi < oversold && currentRsi >= oversold;
                const overboughtCross = prevRsi !== null && prevRsi > overbought && currentRsi <= overbought;

                // 🟢 BUY SIGNAL
                if (!position && oversoldCross && bullish && lastSignal !== 'buy') {
                    logger.info(`${config.name}: 🟢 Buy signal`);
                    lastSignal = 'buy';
                    try {
                        let product_id: number | undefined;
                        if (exchangeName === 'delta') {
                            // ✅ frontend already sends correct symbol (e.g. "BTCUSDT" or "BTC/USDT")
                            product_id = deltaProductMap[tradingSymbol];
                        }

                        const result = await executeOrderForUser({
                            userId: userId || 'unknown',
                            exchange: exchangeName as any,
                            symbol: tradingSymbol,
                            side: 'BUY',
                            quantity: Number((configuration as any).quantity ?? 0.01),
                            type: 'MARKET',
                            product_id,
                        });

                        logger.info({ result }, '✅ BUY executed');
                        position = { side: 'long', entry: lastClose };

                        // ✅ Verify order status (Delta only)
                        if (exchangeName === 'delta' && result?.result?.id) {
                            const verify = await fetchDeltaOrderById(
                                broker_config.apiKey,
                                broker_config.apiSecret,
                                result.result.id
                            );
                            logger.info({ verify }, '📦 Order verified on Delta');
                        }
                    } catch (err) {
                        logger.error({ err }, '❌ Failed to execute BUY');
                    }
                }

                // 🔴 SELL SIGNAL
                if (position && position.side === 'long' && overboughtCross && lastSignal !== 'sell') {
                    logger.info(`${config.name}: 🔴 Sell signal`);
                    lastSignal = 'sell';
                    try {
                        let product_id: number | undefined;
                        if (exchangeName === 'delta') {
                            product_id =
                                deltaProductMap[tradingSymbol];
                        }

                        const result = await executeOrderForUser({
                            userId: userId || 'unknown',
                            exchange: exchangeName as any,
                            symbol: tradingSymbol,
                            side: 'SELL',
                            quantity: Number((configuration as any).quantity ?? 0.01),
                            type: 'MARKET',
                            product_id,
                        });

                        logger.info({ result }, '✅ SELL executed');
                        position = null;

                        if (exchangeName === 'delta' && result?.result?.id) {
                            const verify = await fetchDeltaOrderById(
                                broker_config.apiKey,
                                broker_config.apiSecret,
                                result.result.id
                            );
                            logger.info({ verify }, '📦 Sell order verified on Delta');
                        }
                    } catch (err) {
                        logger.error({ err }, '❌ Failed to execute SELL');
                    }
                }
            } catch (err) {
                logger.error({ err }, '❌ Error in trading loop');
            }

            await new Promise(r => setTimeout(r, pollInterval));
        }

        logger.info(`🛑 Bot ${config.name} stopped.`);
    })();
}

// ✅ Stop Bot
export function stopTradingBot(name: string) {
    const bot = activeBots[name];
    if (!bot) return false;
    bot.stopSignal = true;
    delete activeBots[name];
    logger.info(`🛑 Stop signal sent to bot: ${name}`);
    return true;
}

export function getBotStatus(name: string) {
    return !!activeBots[name];
}

export function getAllRunningBots() {
    return Object.keys(activeBots);
}

export { activeBots };
