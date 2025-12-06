import type { BotConfig } from "../types/botTypes.js";
import { placeOrderAndAwaitFill } from "../services/orderExecutor.js";
import { fetchCandlesFromBinance } from "../services/fetchCandles.js";
import { BotModel } from "../models/BotModel.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =========================================
//  LOCAL RSI CALCULATION (TradingView-Style)
// =========================================
function computeRSI(closes: number[], period = 14) {
  const rsiPeriod = period ? Number(period) : 14;

  if (!Number.isFinite(rsiPeriod) || rsiPeriod < 2) {
    console.warn("Invalid RSI period received:", rsiPeriod);
  }

  if (closes.length < rsiPeriod + 1) return NaN;

  let gains = 0;
  let losses = 0;

  // Sum last N differences
  for (let i = closes.length - rsiPeriod; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / rsiPeriod;
  const avgLoss = losses / rsiPeriod;

  if (avgLoss === 0) return 100; // straight uptrend
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// =========================================
//  TRADING BOT IMPLEMENTATION
// =========================================
export async function startTradingBot(config: BotConfig, botDoc: any) {
  try {
    let stopped = false;
    const symbol = config.symbol;
    const apiSymbol = symbol.replace("/", ""); // Binance format: BTCUSDT
    const quantity = Number(
      config.configuration.quantity ?? 0.01
    );
    const userId = botDoc.userId;
    const rsiBuy = Number(
      config.configuration.oversold ?? config.configuration.rsiBuy ?? 30
    );
    const rsiSell = Number(
      config.configuration.overbought ?? config.configuration.rsiSell ?? 70
    );
    const rsiPeriod = Number(config.configuration.period ?? 14);

    // =========================================
    //  INTERNAL BOT STATE (persisted to DB)
    // =========================================
    let state = {
      inPosition: false,
      entryPrice: null as number | null,
      lastActionAt: 0,
      cooldownMs: 3000,
    };

    // Load previous runtime from DB if available
    if (botDoc.runtime) {
      state = {
        ...state,
        ...botDoc.runtime,
      };
    }

    // Persist runtime in DB
    async function persistRuntime() {
      await BotModel.findByIdAndUpdate(
        botDoc.id,
        { runtime: state },
        { new: true }
      );
    }

    console.log(`[BOT ${botDoc.id}] Started bot`);

    // =========================================
    //  STOP HANDLER (botManager will call this)
    // =========================================
    const stop = async () => {
      stopped = true;
      console.log(`[BOT ${botDoc.id}] Stopped`);
    };

    // =========================================
    //  MAIN LOOP
    // =========================================
    (async function loop() {
      while (!stopped) {
        try {
          const timeframe = config.timeframe ?? "1m";

          // -----------------------------------------
          // 🔵 STEP 1: Loop start log
          // -----------------------------------------
          console.log(
            `[BOT ${botDoc.id}] Loop | TF=${timeframe} | inPosition=${state.inPosition} | lastAction=${state.lastActionAt}`
          );

          console.log("config loop -",config);
                    console.log("botDoc loop -",botDoc);


          // -----------------------------------------
          // 🔵 STEP 2: Fetch candles
          // -----------------------------------------
          console.log(`[BOT ${botDoc.id}] Fetching candles...`);
          const candles = await fetchCandlesFromBinance(
            apiSymbol,
            timeframe,
            200
          );

          const closes = candles.map((c) => c.close);
          const rsi = computeRSI(closes, rsiPeriod);

          // Log RSI
          console.log(
            `[BOT ${botDoc.id}] RSI=${rsi} | Buy<=${rsiBuy} | Sell>=${rsiSell}`
          );

          const now = Date.now();

          // -----------------------------------------
          // 🔵 STEP 3: BUY SIGNAL
          // -----------------------------------------
          if (
            !state.inPosition &&
            Number.isFinite(rsi) &&
            rsi <= rsiBuy &&
            now - state.lastActionAt > state.cooldownMs
          ) {
            console.log(`[BOT ${botDoc.id}] BUY SIGNAL TRIGGERED`);
            console.log("symbol in trading bot",apiSymbol);
            const order = await placeOrderAndAwaitFill({
              userId,
              exchangeName:
                botDoc.exchange ??
                "delta",
              symbol: "BTCUSD",
              side: "buy",
              amount: quantity,
              type: "market",
            });

            const filled = Number(order?.filled ?? order?.amount ?? 0);

            if (filled > 0) {
              state.inPosition = true;
              state.entryPrice = Number(order?.price ?? order?.average ?? null);
              state.lastActionAt = Date.now();

              console.log(
                `[BOT ${botDoc.id}] BUY FILLED | price=${state.entryPrice} | qty=${quantity}`
              );

              await persistRuntime();
            }
          }

          // -----------------------------------------
          // 🔵 STEP 4: SELL SIGNAL
          // -----------------------------------------
          if (
            state.inPosition &&
            Number.isFinite(rsi) &&
            rsi >= rsiSell &&
            now - state.lastActionAt > state.cooldownMs
          ) {
            console.log(`[BOT ${botDoc.id}] SELL SIGNAL TRIGGERED`);

            const order = await placeOrderAndAwaitFill({
              userId,
              exchangeName:
                botDoc.exchange ??
                "delta",
              symbol: "BTCUSD",
              side: "sell",
              amount: quantity,
              type: "market",
            });

            const filled = Number(order?.filled ?? order?.amount ?? 0);

            if (filled > 0) {
              const exitPrice = Number(order?.price ?? order?.average ?? null);

              state.inPosition = false;
              state.entryPrice = null;
              state.lastActionAt = Date.now();

              console.log(
                `[BOT ${botDoc.id}] SELL FILLED | price=${exitPrice} | qty=${quantity}`
              );

              await persistRuntime();
            }
          }

          // -----------------------------------------
          // 🔵 STEP 5: Sleep
          // -----------------------------------------
          await sleep(4000);
        } catch (err: any) {
          console.error(
            `[BOT ${botDoc.id}] ERROR in loop:`,
            err?.message || err
          );
          await sleep(4000);
        }
      }
    })();

    // Return stop handler to manager
    return stop;
  } catch (err) {
    console.error(`[BOT ${botDoc.id}] ERROR starting bot:`, err);
    throw err;
  }
}
