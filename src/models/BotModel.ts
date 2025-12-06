import mongoose, { Document, Schema } from "mongoose";

export interface IBot extends Document {
  name: string;
  userId?: string;
  exchange: string;
  symbol?: string;
  quantity?: number;
  timeframe?: string;
  strategy_type: string;
  rsiBuy?: number;
  rsiSell?: number;
  brokerId?: string;
  status: "running" | "stopped" | "paused";
  configuration:any;
  runtime?: {
    inPosition: boolean;
    entryPrice?: number | null;
    lastActionAt?: number;
  };

}

const BotSchema = new Schema<IBot>(
  {
    name: { type: String, required: true },
    userId: { type: String },

    exchange: { type: String, required: true },
    symbol: { type: String },
    quantity: { type: Number },
    timeframe: { type: String },
    strategy_type: { type: String, enum: ["RSI", "Custom"], required: true },
    rsiBuy: { type: Number },
    rsiSell: { type: Number },

    brokerId: {
      type: String,
      required: true,
    },

    configuration: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    status: {
      type: String,
      enum: ["running", "stopped", "paused"],
      default: "running",
    },

    runtime: {
      type: Schema.Types.Mixed,
      default: {
        inPosition: false,
        entryPrice: null,
        lastActionAt: 0,
      },
    }
  },
  { timestamps: true }
);

export const BotModel = mongoose.model<IBot>("Bot", BotSchema);
