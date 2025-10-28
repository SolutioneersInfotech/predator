import mongoose from "mongoose";

const tradeLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        exchange: {
            type: String,
            required: true,
            enum: ["delta", "binance", "bybit", "okx"], // ✅ extend as needed
        },
        symbol: {
            type: String,
            required: true,
        },
        side: {
            type: String,
            enum: ["BUY", "SELL"],
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
        price: {
            type: Number,
        },
        type: {
            type: String,
            enum: ["MARKET", "LIMIT"],
            default: "MARKET",
        },
        status: {
            type: String,
            enum: ["PENDING", "SUCCESS", "FAILED"],
            default: "SUCCESS",
        },
        orderId: {
            type: String,
        },
        response: {
            type: Object, // ✅ store full API response for debugging / tracking
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

const TradeLog = mongoose.model("TradeLog", tradeLogSchema);

export default TradeLog;
