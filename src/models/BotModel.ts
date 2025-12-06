import mongoose, { Document, Schema } from "mongoose";

export interface IBot extends Document {
  name: string;
  userId?: string;
  exchange: string;
  symbol?: string;
  quantity?: number;
  timeframe?: string;

  rsiBuy?: number;
  rsiSell?: number;

  status: "running" | "stopped" | "paused";

  runtime?: {
    inPosition: boolean;
    entryPrice?: number | null;
    lastActionAt?: number;
  };

  broker_config?: {
    apiKey?: string;
    apiSecret?: string;
    apiEndpoint?: string;
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

    rsiBuy: { type: Number },
    rsiSell: { type: Number },

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
    },

    broker_config: {
      apiKey: String,
      apiSecret: String,
      apiEndpoint: String,
    },
  },
  { timestamps: true }
);

export const BotModel = mongoose.model<IBot>("Bot", BotSchema);
