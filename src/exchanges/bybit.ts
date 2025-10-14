// exchanges/bybit.ts
import axios from "axios";
import crypto from "crypto";

const BYBIT_BASE = "https://api.bybit.com"; // or testnet: https://api-testnet.bybit.com

function bybitSign(secret: string, params: Record<string, any>) {
    const ordered = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&");
    return crypto.createHmac("sha256", secret).update(ordered).digest("hex");
}

export async function placeBybitOrder(apiKey: string, apiSecret: string, symbol: string, side: "Buy" | "Sell", qty: number, price?: number) {
    const path = "/v2/private/order/create";
    const ts = Date.now();
    const params: any = {
        api_key: apiKey,
        symbol,
        side,
        order_type: price ? "Limit" : "Market",
        qty,
        time_in_force: "GoodTillCancel",
        timestamp: ts,
    };
    if (price) params.price = price;
    params.sign = bybitSign(apiSecret, params);
    const res = await axios.post(`${BYBIT_BASE}${path}`, null, { params });
    return res.data;
}
