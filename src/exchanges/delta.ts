import axios from "axios";
import crypto from "crypto";

// ✅ Dynamic Base URL (Testnet or Mainnet)
const DELTA_BASE = "https://cdn-ind.testnet.deltaex.org";

function getDeltaHeaders(
    apiKey: string,
    apiSecret: string,
    method: string,
    path: string,
    body: any = {}
) {
    // ✅ Timestamp in seconds (as string)
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // ✅ Clean path (no leading slash)
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;

    // ✅ Body string only for non-GET
    const bodyStr =
        method.toUpperCase() === "GET" || !body || Object.keys(body).length === 0
            ? ""
            : JSON.stringify(body);

    // ✅ Correct signature format (same as verifyDeltaCredentials)
    const signatureData = method.toUpperCase() + timestamp + "/" + cleanPath + bodyStr;

    const signature = crypto
        .createHmac("sha256", apiSecret)
        .update(signatureData)
        .digest("hex");

    // 🔍 Debug (optional)
    console.log("🔐 Delta Signature Debug", {
        method,
        path,
        timestamp,
        signatureData,
        signature,
    });

    return {
        "api-key": apiKey,
        timestamp,
        signature,
        "Content-Type": "application/json",
    };
}


export async function placeDeltaOrder(
    apiKey: string,
    apiSecret: string,
    product_id: number,
    side: "buy" | "sell",
    size: number,
    price?: number
) {
    const path = "/v2/orders";

    // // 🧠 FIX HERE: send integer contract size
    // // const sizeInt = Math.round(size); // convert 0.01 → 0
    // const contractMultiplier = 1000; // 1 contract = 0.001 BTC
    // const sizeInt = Math.round(size * contractMultiplier);
    // const body: any = {
    //     product_id,
    //     side,
    //     size: sizeInt, // must be integer
    //     order_type: price ? "limit_order" : "market_order",
    // };

    // if (price) body.limit_price = price;
    // Determine contract size from the provided `size` parameter:
    // - If `size` is an integer > 0, treat it as the contract count directly.
    // - Otherwise treat `size` as an amount to spend in quote currency (e.g. USDT)
    //   and convert to contracts using the provided `price` (which must be present).
    let sizeInt: number;
    if (Number.isInteger(size) && size > 0) {
        // `size` already represents integer contracts
        sizeInt = size;
    } else {
        // treat `size` as amount to spend in quote currency (e.g., USDT)
        const amountToSpend = Number(size); // e.g. 1 USDT
        // require a valid price to convert spend amount to asset quantity
        if (!price || price <= 0) {
            throw new Error(
                "Current price (limit price) is required to convert spend amount to contracts when `size` is not integer contracts."
            );
        }
        const currentPrice = price;
        // 1) amount -> BTC quantity
        const btcQuantity = amountToSpend / currentPrice;
        // 2) BTC quantity -> contracts convert (1 contract = 0.001 BTC => multiplier 1000)
        const contractMultiplier = 1000;
        sizeInt = Math.round(btcQuantity * contractMultiplier); // size must be integer
        if (sizeInt <= 0) {
            throw new Error("Calculated contract size is zero; increase amount or provide correct price.");
        }
    }

    // 3) final order body
    const body: any = {
        product_id,
        side,
        size: sizeInt,
        order_type: price ? "limit_order" : "market_order",
    };

    // limit order ho to price set karenge
    if (price) body.limit_price = price;


    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = "POST";
    const queryString = "";
    const payload = JSON.stringify(body);
    const signatureData = method + timestamp + path + queryString + payload;

    const signature = crypto.createHmac("sha256", apiSecret).update(signatureData).digest("hex");

    const headers = {
        "api-key": apiKey,
        "timestamp": timestamp,
        "signature": signature,
        "Content-Type": "application/json",
    };

    console.log("🚀 Sending Order →", body);
    console.log("🔐 Signature Debug:", { signatureData, signature, timestamp });

    try {
        const res = await axios.post(`${DELTA_BASE}${path}`, body, { headers });
        console.log("✅ Order Response:", res.data);
        return res.data;
    } catch (err: any) {
        if (err.response) {
            console.error("❌ Delta API Error:", err.response.data);
            throw new Error(
                `Delta API Error: ${JSON.stringify(err.response.data)}`
            );
        }
        throw new Error("Failed to place Delta order");
    }
}




/**
 * ✅ Fetch all products from Delta Exchange
 * Used to map symbols (e.g. BTC/USDT → product_id)
 */
export async function fetchDeltaProducts() {
    try {
        const res = await axios.get(`${DELTA_BASE}/v2/products`);
        if (res.data?.result) {
            // Return a simplified map: { "BTC/USDT": 123, "ETH/USDT": 456 }
            const map: Record<string, number> = {};
            for (const p of res.data.result) {
                map[p.symbol] = p.id;
            }
            return map;
        }
        throw new Error("Invalid response format from Delta");
    } catch (err: any) {
        console.error("❌ Failed to fetch Delta products:", err.response?.data || err.message);
        throw new Error("Failed to load Delta products");
    }
}

/**
 * ✅ Check account balance (optional helper)
 */
export async function fetchDeltaBalance(apiKey: string, apiSecret: string) {
    const path = "/v2/wallet/balances";
    try {
        const res = await axios.get(`${DELTA_BASE}${path}`, {
            headers: getDeltaHeaders(apiKey, apiSecret, "GET", path),
        });
        return res.data;
    } catch (err: any) {
        console.error("❌ Failed to fetch Delta balance:", err.response?.data || err.message);
        throw new Error("Failed to get Delta balance");
    }
}

/**
 * ✅ Cancel all open orders (optional helper)
 */
export async function cancelAllDeltaOrders(apiKey: string, apiSecret: string) {
    const path = "/v2/orders/all";
    try {
        const res = await axios.delete(`${DELTA_BASE}${path}`, {
            headers: getDeltaHeaders(apiKey, apiSecret, "DELETE", path),
        });
        return res.data;
    } catch (err: any) {
        console.error("❌ Failed to cancel Delta orders:", err.response?.data || err.message);
        throw new Error("Failed to cancel Delta orders");
    }
}

/**
 * 🆕 ✅ Fetch order details by ID (for verification)
 */
export async function fetchDeltaOrderById(apiKey: string, apiSecret: string, orderId: string | number) {
    const path = `/v2/orders/${orderId}`;
    try {
        const res = await axios.get(`${DELTA_BASE}${path}`, {
            headers: getDeltaHeaders(apiKey, apiSecret, "GET", path),
        });
        return res.data;
    } catch (err: any) {
        console.error("❌ Failed to fetch Delta order by ID:", err.response?.data || err.message);
        throw new Error("Failed to verify Delta order");
    }
}
export async function fetchDeltaOrderHistory(apiKey: string, apiSecret: string) {
    const path = "/v2/orders/history";

    try {
        const res = await axios.get(`${DELTA_BASE}${path}`, {
            headers: getDeltaHeaders(apiKey, apiSecret, "GET", path),
        });

        return res.data;
    } catch (err: any) {
        console.error("❌ Failed to fetch Delta order history:", err.response?.data || err.message);
        throw new Error("Failed to get Delta order history");
    }
}
export async function fetchDeltaFillsHistory(apiKey: string, apiSecret: string) {
    const path = "/v2/fills";

    try {
        const res = await axios.get(`${DELTA_BASE}${path}`, {
            headers: getDeltaHeaders(apiKey, apiSecret, "GET", path),
        });

        return res.data;
    } catch (err: any) {
        console.error("❌ Failed to fetch Delta fills:", err.response?.data || err.message);
        throw new Error("Failed to get Delta trade fills");
    }
}

export async function fetchEquityChange(apiKey: string, apiSecret: string) {
    const path = `/v2/users/account_analytics/equity_change`;
    try {
        const res = await axios.get(`${DELTA_BASE}${path}`, {
            headers: getDeltaHeaders(apiKey, apiSecret, "GET", path),
        });
        return res.data;
    } catch (err: any) {
        console.error("❌ Failed to fetch Delta order by ID:", err.response?.data || err.message);
        throw new Error("Failed to verify Delta order");
    }
}
