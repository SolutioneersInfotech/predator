import type { IBot } from "../models/BotModel.js";
import type { BotConfig } from "../types/botTypes.js";

/**
 * Convert DB Bot document (IBot) into the engine's BotConfig.
 * Uses legacy fields mapping:
 *  - oversold  <- rsiBuy
 *  - overbought <- rsiSell
 *  - period <- timeframe
 */
export function convertBotDocToBotConfig(bot: IBot): BotConfig {
  return {
    name: bot.name,
    strategy_type: "RSI",
    timeframe: bot.timeframe ?? (bot.rsiBuy ? "1m" : "1m"),

    configuration: {
      // map legacy keys (UI speaks these):
      oversold: bot.rsiBuy !== undefined ? String(bot.rsiBuy) : undefined,
      overbought: bot.rsiSell !== undefined ? String(bot.rsiSell) : undefined,
      period: bot.timeframe ?? undefined,

      // also set typed RSI fields for internal convenience
      rsiBuy: bot.rsiBuy,
      rsiSell: bot.rsiSell,
      quantity: bot.quantity,
    },

    broker_config: {
      apiKey: bot.broker_config?.apiKey ?? "",
      apiSecret: bot.broker_config?.apiSecret ?? "",
      apiEndpoint: bot.broker_config?.apiEndpoint ?? bot.exchange ?? "",
    },

    symbol: bot.symbol,
  };
}
