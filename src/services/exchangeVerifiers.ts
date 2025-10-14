// services/exchangeVerifiers.ts
// import Binance from "binance-api-node";
// import axios from "axios";
// import crypto from "crypto";

// /**
//  * Verify Binance API key by calling accountInfo (requires proper permissions).
//  */
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

// /**
//  * Placeholder: Bybit verification (you must implement signing or use official SDK)
//  */
// export async function verifyBybitCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
//     // Use Bybit test endpoint + signing or official SDK to verify - simplified placeholder:
//     try {
//         // Example: attempt to call wallet balance endpoint with signed request
//         // Implement signing logic similar to placeBybitOrder in wrappers before using
//         return true;
//     } catch (err) {
//         console.error("verifyBybitCredentials err:", err);
//         return false;
//     }
// }

// /**
//  * Verify Delta Exchange API credentials by calling balances endpoint.
//  * Works for both mainnet and testnet (change base URL as needed).
//  */
// export async function verifyDeltaCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
//     try {
//         // ✅ For Testnet, use: https://testnet-api.delta.exchange
//         // const BASE_URL = "https://api.delta.exchange";
//         const BASE_URL = "https://testnet-api.delta.exchange";
//         const endpoint = "/v2/accounts/me"; // ✅ correct endpoint
//         const method = "GET";
//         const timestamp = Math.floor(Date.now() / 1000).toString();

//         // signature payload = timestamp + method + endpoint
//         const payload = timestamp + method + endpoint;
//         const signature = crypto
//             .createHmac("sha256", apiSecret)
//             .update(payload)
//             .digest("hex");

//         const res = await axios.get(`${BASE_URL}${endpoint}`, {
//             headers: {
//                 "api-key": apiKey,
//                 "timestamp": timestamp,
//                 "signature": signature,
//             },
//         });

//         return res.status === 200 && res.data && Array.isArray(res.data.result);
//     } catch (err: any) {
//         console.error("verifyDeltaCredentials error:", err?.response?.data || err?.message || err);
//         return false;
//     }
// }



// // TODO: Add verifyOKXCredentials when implementing wrappers


// // services/exchangeVerifiers.ts
// import Binance from "binance-api-node";
// import axios from "axios";
// import crypto from "crypto";

// /**
//  * Verify Binance API key by calling accountInfo (requires proper permissions).
//  */
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

// /**
//  * Placeholder for Bybit credentials verification.
//  * Implement signing logic or use official SDK for full verification.
//  */
// export async function verifyBybitCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
//     try {
//         // Example: attempt a simple wallet balance call
//         return true; // Placeholder
//     } catch (err) {
//         console.error("verifyBybitCredentials error:", err);
//         return false;
//     }
// }

// /**
//  * Verify Delta Exchange API credentials.
//  * Supports Testnet and Mainnet (set `useTestnet` true/false)
//  */
// export async function verifyDeltaCredentials(
//     apiKey: string,
//     apiSecret: string,
//     useTestnet: boolean = true
// ): Promise<boolean> {
//     try {
//         const BASE_URL = useTestnet
//             ? "https://cdn-ind.testnet.deltaex.org"
//             : "https://api.delta.exchange";
//         const endpoint = "/v2/profile"; // Correct endpoint
//         const method = "GET";
//         const timestamp = Math.floor(Date.now() / 1000).toString();

//         // Signature: HMAC_SHA256(apiSecret, timestamp + method + endpoint)
//         const payload = timestamp + method + endpoint;
//         const signature = crypto.createHmac("sha256", apiSecret).update(payload).digest("hex");

//         console.log("Delta verify payload:", { payload, signature, timestamp, apiKey, BASE_URL });

//         const res = await axios.get(`${BASE_URL}${endpoint}`, {
//             headers: {
//                 "api-key": apiKey,
//                 "timestamp": timestamp,
//                 "signature": signature,
//             },
//         });

//         console.log("Delta verify response:", res.status, res.data);

//         // Validate response structure
//         if (res.status === 200 && res.data?.result && Array.isArray(res.data.result)) {
//             return true;
//         } else {
//             console.error("Delta verification failed: invalid response structure");
//             return false;
//         }
//     } catch (err: any) {
//         // Detailed error logging
//         console.error(
//             "verifyDeltaCredentials error:",
//             err.response?.data || err.message || err
//         );
//         return false;
//     }
// }


// services/exchangeVerifiers.ts
import Binance from "binance-api-node";
import axios from "axios";
import crypto from "crypto";

/**
 * ✅ Verify Binance Credentials
 */
export async function verifyBinanceCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
        const client = Binance({ apiKey, apiSecret });
        const acc = await client.accountInfo();
        return !!acc && !!acc.balances;
    } catch (err: any) {
        console.error("verifyBinanceCredentials error:", err?.message || err);
        return false;
    }
}

/**
 * ✅ Placeholder for Bybit (you can fill later)
 */
export async function verifyBybitCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
        return true;
    } catch (err) {
        console.error("verifyBybitCredentials error:", err);
        return false;
    }
}

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
