// exchanges/delta.ts
import axios from "axios";
import crypto from "crypto";

// const DELTA_BASE = "https://api.delta.exchange";
const DELTA_BASE = "https://cdn-ind.testnet.deltaex.org";

function getDeltaHeaders(apiKey: string, apiSecret: string, method: string, path: string, body: any = {}) {
    const ts = Math.floor(Date.now() / 1000);
    const bodyStr = Object.keys(body).length ? JSON.stringify(body) : "";
    const pre = `${ts}${method.toUpperCase()}${path}${bodyStr}`;
    const signature = crypto.createHmac("sha256", apiSecret).update(pre).digest("hex");
    return {
        "api-key": apiKey,
        "timestamp": ts,
        "signature": signature,
        "Content-Type": "application/json",
    };
}

export async function placeDeltaOrder(apiKey: string, apiSecret: string, product_id: number, side: "buy" | "sell", size: number, price?: number) {
    const path = "/v2/orders";
    const body: any = { product_id, side, size, order_type: price ? "limit_order" : "market_order" };
    if (price) body.limit_price = price;
    const res = await axios.post(`${DELTA_BASE}${path}`, body, { headers: getDeltaHeaders(apiKey, apiSecret, "POST", path, body) });
    return res.data;
}
