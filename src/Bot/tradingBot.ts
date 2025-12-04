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
