// src/models/TradeLog.ts
// import mongoose from "mongoose";

// const TradeLogSchema = new mongoose.Schema(
//   {
//     botId: { type: String, required: true, index: true }, // reference to BotModel._id
//     userId: { type: String, required: true, index: true },

//     exchange: { type: String, required: true },
//     symbol: { type: String, required: true }, // normalized symbol used for the trade

//     side: { type: String, enum: ["buy", "sell"], required: true },
//     type: { type: String, enum: ["market", "limit", "ioc", "post_only"], default: "market" },

//     amount: { type: Number, required: true },
//     price: { type: Number, required: true },

//     orderId: { type: String }, // exchange order id if available

//     // Realized pnl for this trade (for sell trades this should be (sellPrice - entryPrice) * qty)
//     pnl: { type: Number, default: null },

//     // optional free-form exchange response (can be used for debugging)
//     rawResponse: { type: mongoose.Schema.Types.Mixed },

//     // closedAt if this trade is an exit (duplicate optional)
//     closedAt: { type: Date, default: null },
//   },
//   { timestamps: true }
// );

// export default mongoose.model("TradeLog", TradeLogSchema);


import mongoose from "mongoose";

const TradeLogSchema = new mongoose.Schema(
  {
    botId: {
      type: String,
      default: null,       // 🔥 FIX: manual trades allowed
      index: true,
    },

    userId: {
      type: String,        // 🔥 authId stored here
      required: true,
      index: true,
    },

    exchange: { type: String, required: true },
    symbol: { type: String, required: true },

    side: {
      type: String,
      enum: ["buy", "sell"],
      required: true,
    },

    type: {
      type: String,
      enum: ["market", "limit", "ioc", "post_only"],
      default: "market",
    },

    amount: { type: Number, required: true },
    price: { type: Number, required: true },

    orderId: { type: String },
    pnl: { type: Number, default: null },
    rawResponse: { type: mongoose.Schema.Types.Mixed },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("TradeLog", TradeLogSchema);
