import { BotModel } from "../models/BotModel.js";
import type { IBot } from "../models/BotModel.js";
import { convertBotDocToBotConfig } from "./botMapper.js";
import { startTradingBot } from "./tradingBot.js";
import pino from "pino";

const logger = pino();

/**
 * BotManager keeps in-memory registry of running bots, persists status,
 * and supports resumeAllOnStartup.
 */
class BotManager {
  private activeBots = new Map<string, { stop: () => Promise<void> }>();

  async startBot(botDoc: IBot) {
    if (this.activeBots.has(botDoc.id)) {
      logger.info(`Bot ${botDoc.id} already running`);
      return;
    }

    console.log(`[MANAGER] Bot ${botDoc.id} already running`);


    // persist DB status
    await BotModel.findByIdAndUpdate(botDoc.id, { status: "running" });

    // convert doc -> config expected by engine
    const config = convertBotDocToBotConfig(botDoc);

    const stopFn = await startTradingBot(config, botDoc);

    this.activeBots.set(botDoc.id, { stop: stopFn });

    console.log(`[MANAGER] Bot ${botDoc.id} already running`);


    logger.info({ botId: botDoc.id }, "Started bot");
  }

  async stopBot(botId: string) {
    console.log(`[MANAGER] Stopping bot ${botId}`);
    const entry = this.activeBots.get(botId);
    if (entry) {
      try {
        await entry.stop();
      } catch (e) {
        console.error(`[MANAGER] Error stopping:`, e);
        logger.error(e);
      }
      this.activeBots.delete(botId);
    }
    await BotModel.findByIdAndUpdate(botId, { status: "stopped" });
    console.log(`[MANAGER] Bot ${botId} stopped`);
    logger.info({ botId }, "Stopped bot");
  }

  async resumeAllOnStartup() {
    logger.info("Resuming bots from DB...");
    const running = await BotModel.find({ status: "running" });
    for (const b of running) {
      try {
        await this.startBot(b);
      } catch (err) {
        logger.error({ botId: b.id, err }, "Failed to resume bot");
      }
    }
  }

  getActiveBotIds() {
    return Array.from(this.activeBots.keys());
  }
}

export const botManager = new BotManager();
