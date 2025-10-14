// exchanges/okx.ts
import axios from "axios";
import crypto from "crypto";

const OKX_BASE = "https://www.okx.com"; // change to testnet if necessary

function signOKX(apiSecret: string, timestamp: string, method: string, requestPath: string, body: string) {
    const pre = timestamp + method.toUpperCase() + requestPath + body;
    return crypto.createHmac("sha256", apiSecret).update(pre).digest("base64");
}

async function okxRequest(apiKey: string, apiSecret: string, passphrase: string, method: string, path: string, body: any = {}) {
    const ts = new Date().toISOString();
    const bodyStr = Object.keys(body).length ? JSON.stringify(body) : "";
    const sign = signOKX(apiSecret, ts, method, path, bodyStr);
    const headers: any = {
        "OK-ACCESS-KEY": apiKey,
        "OK-ACCESS-SIGN": sign,
        "OK-ACCESS-TIMESTAMP": ts,
        "OK-ACCESS-PASSPHRASE": passphrase,
        "Content-Type": "application/json",
    };
    const res = await axios(`${OKX_BASE}${path}`, { method, headers, data: bodyStr || undefined });
    return res.data;
}

export async function placeOKXOrder(apiKey: string, apiSecret: string, passphrase: string, instId: string, side: "buy" | "sell", sz: string, px?: string) {
    return okxRequest(apiKey, apiSecret, passphrase, "POST", "/api/v5/trade/order", { instId, tdMode: "cash", side, ordType: px ? "limit" : "market", sz, px });
}
