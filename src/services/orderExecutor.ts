import { retry } from "../utils/retry.js";
import { exchangeFor } from "../exchanges/exchangeFactory.js";
import ExchangeCredential from "../models/ExchangeCredential.js";
import { decryptText } from "../utils/crypto.js";

/**
 * Sleep helper
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * WARNING:
 * Delta Testnet does NOT support fetchOrder().
 * We must track orders using:
 *   - fetchOpenOrders()
 *   - fetchClosedOrders()
 */
export async function placeOrderAndAwaitFill({
    userId,
    exchangeName,
    symbol,
    side,
    amount,
    type = "market",
    price = undefined,
    timeoutMs = 120_000,
}: {
    userId: string;
    exchangeName: string;
    symbol: string;
    side: "buy" | "sell" | string;
    amount: number;
    type?: string;
    price?: number | undefined;
    timeoutMs?: number;
}) {
    // 🔹 Fetch exchange credentials
    const cred = await ExchangeCredential.findOne({
        userId,
        exchange: exchangeName,
    }).exec();

    if (!cred) {
        throw new Error(`Exchange ${exchangeName} not connected for user`);
    }

    const apiKey = decryptText(cred.apiKey_enc);
    const apiSecret = decryptText(cred.apiSecret_enc);

    // 🔹 Force CCXT to use DELTA TESTNET URLs
    const options: any = {
        apiKey,
        secret: apiSecret,
        enableRateLimit: true,
        urls: {
            api: {
                public: "https://cdn-ind.testnet.deltaex.org",
                private: "https://cdn-ind.testnet.deltaex.org",
            },
        },
    };

    // 🔹 Create exchange instance
    const exchange = exchangeFor(exchangeName, options);

    // 🔹 Load markets (REQUIRED for Delta)
    await exchange.loadMarkets();

    console.log(
        `[ORDER] Creating ${side.toUpperCase()} order: ${amount} ${symbol}`
    );

    // 🔹 Create order
    const order = await retry(() =>
        exchange.createOrder(symbol, type, side, amount, price)
    );

    console.log("[ORDER] Order created:", order.id);

    const start = Date.now();

    /**
     * ==========================================
     * 🔥 NEW DELTA-COMPATIBLE ORDER POLLING LOGIC
     * ==========================================
     * Delta Testnet does NOT support fetchOrder()
     * so we track fills using open + closed orders.
     */
    while (Date.now() - start < timeoutMs) {
        try {
            // 🔹 Check CLOSED orders
            const closedOrders = await exchange.fetchClosedOrders(symbol);
            const closed = closedOrders.find((o: any) => o.id === order.id);

            if (closed) {
                console.log(
                    `[ORDER] CLOSED → Filled order ${order.id}`,
                    closed
                );
                return closed;
            }

            // 🔹 Check OPEN orders
            const openOrders = await exchange.fetchOpenOrders(symbol);
            const open = openOrders.find((o: any) => o.id === order.id);

            if (open) {
                console.log(
                    `[ORDER] OPEN → Pending order ${order.id} | filled=${open.filled ?? 0}`
                );
            } else {
                // Not in open OR closed → must be cancelled or system-removed
                console.log(
                    `[ORDER] Order ${order.id} disappeared (not open or closed). Treating as canceled/failed.`
                );
                return order;
            }
        } catch (err: any) {
            console.log(
                `[ORDER] Polling error for ${order.id}:`,
                err?.message ?? err
            );
        }

        await sleep(2000); // small delay
    }

    console.log(
        `[ORDER] TIMEOUT after ${timeoutMs}ms → returning original order object`
    );
    return order;
}
