import mongoose from "mongoose";

const botSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    strategy_type: { type: String, required: true },
    timeframe: { type: String, required: true },
    status: { type: String, default: "stopped" }, // active/stopped/error
    broker_config: {
        apiKey: String,
        apiSecret: String,
        apiEndpoint: String,
    },
    symbol: { type: String, default: "BTC/USDT" },
    configuration: { type: mongoose.Schema.Types.Mixed },
    created_at: { type: Date, default: Date.now },
});

export const BotModel = mongoose.model("Bot", botSchema);
