import TradeLog from "../models/TradeLog.js";
import ExchangeCredential from "../models/ExchangeCredential.js";
import { decryptText } from "../utils/crypto.js";
import * as delta from "../exchanges/delta.js";
import * as binance from "../exchanges/binance.js";
import * as bybit from "../exchanges/bybit.js";

export async function executeOrderForUser(order) {
    const cred = await ExchangeCredential.findOne({
        // userId: order.userId,
        authId: order.authId,
        exchange: order.exchange,
    }).exec();

    if (!cred) throw new Error(`Exchange ${order.exchange} not connected for user`);

    const apiKey = decryptText(cred.apiKey_enc);
    const apiSecret = decryptText(cred.apiSecret_enc);
    const passphrase = cred.passphrase_enc ? decryptText(cred.passphrase_enc) : undefined;

    // STEP 1: 🔥 BEFORE placing order — create trade log (PENDING)
    // const tradeLog = await TradeLog.create({
    //     userId: order.userId,
    //     exchange: order.exchange,
    //     symbol: order.symbol,
    //     side: order.side,
    //     size: order.quantity,       // 🔥 IMPORTANT: quantity = size
    //     price: order.price,
    //     type: order.type || "MARKET",
    //     status: "PENDING",
    // });
    const tradeLog = await TradeLog.create({
        botId: null,                              // manual trade
        userId: order.authId,                    // 🔥 authId yahan
        exchange: order.exchange,
        symbol: order.symbol,
        side: order.side.toLowerCase(),           // 🔥 BUY → buy
        type: order.type.toLowerCase(),           // 🔥 LIMIT → limit
        amount: Number(order.quantity),            // 🔥 REQUIRED FIELD
        price: Number(order.price),                // 🔥 REQUIRED FIELD
    });


    let result;

    try {
        switch (order.exchange.toLowerCase()) {
            case "delta":
                result = await delta.placeDeltaOrder(
                    apiKey,
                    apiSecret,
                    order.product_id,
                    order.side.toLowerCase(),
                    order.quantity,
                    order.price
                );
                break;

            case "binance":
                result = await (binance as any).placeBinanceOrder(
                    apiKey,
                    apiSecret,
                    order.symbol,
                    order.side.toLowerCase(),
                    order.quantity,
                    order.price
                );
                break;

            case "bybit":
                result = await bybit.placeBybitOrder(
                    apiKey,
                    apiSecret,
                    order.symbol,
                    order.side === "BUY" ? "Buy" : "Sell",
                    order.quantity,
                    order.price
                );
                break;

            default:
                throw new Error(`Exchange ${order.exchange} not supported`);
        }

        // STEP 2: 🔥 On SUCCESS → update log
        await TradeLog.findByIdAndUpdate(tradeLog._id, {
            status: "SUCCESS",
            orderId: result?.result?.id || result?.orderId || null,
            response: result,
        });

        return result;

    } catch (err) {
        // STEP 3: 🔥 On FAIL → update log
        await TradeLog.findByIdAndUpdate(tradeLog._id, {
            status: "FAILED",
            response: { error: err.message },
        });

        throw err;
    }
}
