


// services/exchangeVerifiers.ts
// import Binance from "binance-api-node";
import axios from "axios";
import crypto from "crypto";

/**
 * ✅ Verify Binance Credentials
 */
// export async function verifyBinanceCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
//     try {
//         const client = Binance({ apiKey, apiSecret });
//         const acc = await client.accountInfo();
//         return !!acc && !!acc.balances;
//     } catch (err: any) {
//         console.error("verifyBinanceCredentials error:", err?.message || err);
//         return false;
//     }
// }

/**
 * ✅ Placeholder for Bybit (you can fill later)
 */
// export async function verifyBybitCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
//     try {
//         return true;
//     } catch (err) {
//         console.error("verifyBybitCredentials error:", err);
//         return false;
//     }
// }

/**
 * ✅ Verify Delta Exchange Credentials
 * Works for both Testnet and Mainnet.
 */
export async function verifyDeltaCredentials(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean = true
): Promise<boolean> {
    try {
        // ✅ Correct Base URLs
        const BASE_URL = useTestnet
            ? "https://cdn-ind.testnet.deltaex.org"
            : "https://api.delta.exchange";

        const method = "GET";
        const path = "/v2/profile";
        const queryString = "";     // no query params for profile
        const payload = "";         // empty for GET

        // ✅ Timestamp in seconds
        const timestamp = Math.floor(Date.now() / 1000).toString();

        // ✅ Signature format: method + timestamp + path + query_string + payload
        const signatureData = method + timestamp + path + queryString + payload;

        console

        const signature = crypto
            .createHmac("sha256", apiSecret)
            .update(signatureData)
            .digest("hex");

        const url = `${BASE_URL}${path}`;

        console.log("🔐 Delta Signature Debug", {
            BASE_URL,
            path,
            timestamp,
            signatureData,
            signature,
        });



        const res = await axios.get(url, {
            headers: {
                "api-key": apiKey,
                "timestamp": timestamp,
                "signature": signature,
                "Content-Type": "application/json",
                "User-Agent": "node-rest-client",
            },
        });

        console.log("✅ Delta verify response:", res.status, res.data);

        if (res.status === 200 && res.data?.success === true) {
            return true;
        } else {
            console.error("❌ Delta verification failed:", res.data);
            return false;
        }
    } catch (err: any) {
        console.error("verifyDeltaCredentials error:", err.response?.data || err.message || err);
        return false;
    }
}
