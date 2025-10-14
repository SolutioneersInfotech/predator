// services/tradeExecutor.ts
import ExchangeCredential from "../models/ExchangeCredential.js";
import { decryptText } from "../utils/crypto.js";
import * as binance from "../exchanges/binance.js";
import * as bybit from "../exchanges/bybit.js";
import * as okx from "../exchanges/okx.js";
import * as delta from "../exchanges/delta.js";

export type ExchangeName = "binance" | "bybit" | "okx" | "delta";

export interface ExecOrder {
    userId: string;
    exchange: ExchangeName;
    symbol: string;
    side: "BUY" | "SELL";
    quantity: number;
    price?: number;
    type?: "MARKET" | "LIMIT";
}

export async function executeOrderForUser(order: ExecOrder) {
    const cred = await ExchangeCredential.findOne({ userId: order.userId, exchange: order.exchange });
    if (!cred) throw new Error("Exchange not connected for user");

    const apiKey = decryptText(cred.apiKey_enc);
    const apiSecret = decryptText(cred.apiSecret_enc);
    const passphrase = cred.passphrase_enc ? decryptText(cred.passphrase_enc) : undefined;

    switch (order.exchange) {
        case "binance":
            return await binance.placeBinanceOrder(apiKey, apiSecret, {
                symbol: order.symbol,
                side: order.side,
                quantity: order.quantity,
                price: order.price,
                type: order.type || "MARKET",
            });
        case "bybit":
            // convert BUY|SELL to Bybit side "Buy"|"Sell"
            return await bybit.placeBybitOrder(apiKey, apiSecret, order.symbol, order.side === "BUY" ? "Buy" : "Sell", order.quantity, order.price);
        case "okx":
            // OKX uses instId like "BTC-USDT", size is string
            return await okx.placeOKXOrder(apiKey, apiSecret, passphrase!, order.symbol, order.side === "BUY" ? "buy" : "sell", order.quantity.toString(), order.price?.toString());
        case "delta":
            // Delta requires product_id numeric — you must map symbol->product_id elsewhere
            // This example assumes `order.price` is undefined for market, and size==quantity
            const productId = Number(order.price ? order.price : 1); // placeholder - replace with real mapping
            return await delta.placeDeltaOrder(apiKey, apiSecret, productId, order.side === "BUY" ? "buy" : "sell", order.quantity, order.price);
        default:
            throw new Error("Unsupported exchange");
    }
}
