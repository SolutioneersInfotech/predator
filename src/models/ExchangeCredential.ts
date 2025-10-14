// models/ExchangeCredential.ts
// import mongoose from "mongoose";

// export interface IExchangeCredential extends mongoose.Document {
//     userId: mongoose.Types.ObjectId;
//     exchange: string;
//     apiKey_enc: string;
//     apiSecret_enc: string;
//     passphrase_enc?: string; // for OKX
//     createdAt: Date;
// }

// const ExchangeCredentialSchema = new mongoose.Schema<IExchangeCredential>({
//     userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
//     exchange: { type: String, required: true }, // "binance" | "bybit" | "okx" | "delta"
//     apiKey_enc: { type: String, required: true },
//     apiSecret_enc: { type: String, required: true },
//     passphrase_enc: { type: String },
//     createdAt: { type: Date, default: Date.now },
// });

// export default mongoose.models.ExchangeCredential ||
//     mongoose.model<IExchangeCredential>("ExchangeCredential", ExchangeCredentialSchema);


import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExchangeCredential extends Document {
    userId: mongoose.Types.ObjectId;
    exchange: string;
    apiKey_enc: string;
    apiSecret_enc: string;
    passphrase_enc?: string;
    createdAt: Date;
}

// ✅ Schema definition
const ExchangeCredentialSchema = new Schema<IExchangeCredential>({
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    exchange: { type: String, required: true },
    apiKey_enc: { type: String, required: true },
    apiSecret_enc: { type: String, required: true },
    passphrase_enc: { type: String },
    createdAt: { type: Date, default: Date.now },
});

// ✅ Proper TypeScript-safe Model creation
const ExchangeCredential: Model<IExchangeCredential> =
    mongoose.models.ExchangeCredential ||
    mongoose.model<IExchangeCredential>("ExchangeCredential", ExchangeCredentialSchema);

export default ExchangeCredential;
