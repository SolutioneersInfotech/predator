import mongoose, { Document, Schema } from "mongoose";

export interface ISignalResult extends Document {
    commodity: string;
    strategyName: string;
    interval: string;
    limit?: number;
    stopLoss?: {
        price?: number;
        reason?: string;
    };
    result?: {
        meta?: Record<string, any>;
        candles?: { time: string; open: number; high: number; low: number; close: number; volume: number }[];
        smaShort?: number[];
        smaLong?: number[];
        signals?: { type: string; price: number; time: string }[];
    };
    createdAt?: Date;
}

// ✅ Sub-schema for result
const resultSchema = new Schema(
    {
        meta: { type: Object },
        candles: [
            {
                time: String,
                open: Number,
                high: Number,
                low: Number,
                close: Number,
                volume: Number
            }
        ],
        smaShort: [Number],
        smaLong: [Number],
        signals: [
            {
                type: String,
                price: Number,
                time: String
            }
        ]
    },
    { _id: false }
);

const signalResultSchema: Schema = new Schema<ISignalResult>({
    commodity: { type: String, required: true },
    strategyName: { type: String, required: true },
    interval: { type: String, required: true },
    limit: Number,
    stopLoss: {
        price: Number,
        reason: String
    },
    result: resultSchema, // ✅ Nested schema applied
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ISignalResult>("SignalResult", signalResultSchema);



// import mongoose, { Document, Schema } from "mongoose";

// export interface ISignalResult extends Document {
//     commodity: string;
//     strategyName: string; // e.g. "SMA Crossover" or "EMA Crossover"
//     interval: string; // e.g. "1h", "4h", "1d"
//     limit?: number;
//     stopLoss?: {
//         price?: number;
//         reason?: string;
//     };
//     result?: {
//         meta?: Record<string, any>;
//         candles?: {
//             time: string;
//             open: number;
//             high: number;
//             low: number;
//             close: number;
//             volume: number;
//         }[];
//         smaShort?: number[];
//         smaLong?: number[];
//         emaShort?: number[];
//         emaLong?: number[];
//         signals?: {
//             type: "BUY" | "SELL";
//             price: number;
//             time: string;
//         }[];
//     };
//     createdAt?: Date;
// }

// // ✅ Sub-schema for result
// const resultSchema = new Schema(
//     {
//         meta: { type: Object },
//         candles: [
//             {
//                 time: String,
//                 open: Number,
//                 high: Number,
//                 low: Number,
//                 close: Number,
//                 volume: Number
//             }
//         ],
//         smaShort: [Number],
//         smaLong: [Number],
//         emaShort: [Number],
//         emaLong: [Number],
//         signals: [
//             {
//                 type: { type: String, enum: ["BUY", "SELL"] },
//                 price: Number,
//                 time: String
//             }
//         ]
//     },
//     { _id: false }
// );

// const signalResultSchema: Schema = new Schema<ISignalResult>(
//     {
//         commodity: { type: String, required: true },
//         strategyName: { type: String, required: true },
//         interval: { type: String, required: true },
//         limit: Number,
//         stopLoss: {
//             price: Number,
//             reason: String
//         },
//         result: resultSchema,
//         createdAt: { type: Date, default: Date.now }
//     }
// );

// export default mongoose.model<ISignalResult>("SignalResult", signalResultSchema);
