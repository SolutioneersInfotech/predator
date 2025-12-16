// import type { Request, Response } from "express";
// import mongoose from "mongoose";
// import ExchangeCredential from "../models/ExchangeCredential.js";
// import { decryptText } from "../utils/crypto.js";
// import { fetchDeltaBalance, fetchEquityChange } from "../exchanges/delta.js";

// export const getDeltaBalance = async (req: Request, res: Response) => {
//     try {
//         const userId = req.query.userId as string;
//         if (!userId) {
//             return res.status(400).json({ message: "Missing userId" });
//         }

//         console.log("🔍 Fetching Delta credentials for user:", userId);

//         // Fetch keys
//         const creds = await ExchangeCredential.findOne({
//             userId: new mongoose.Types.ObjectId(userId),
//             exchange: "delta",
//         });

//         if (!creds) {
//             return res.status(404).json({ message: "No Delta API credentials found" });
//         }

//         const apiKey = decryptText(creds.apiKey_enc);
//         const apiSecret = decryptText(creds.apiSecret_enc);

//         console.log("🔐 Keys decrypted!");

//         // Fetch Delta balance
//         const balanceResponse = await fetchDeltaBalance(apiKey, apiSecret);

//         console.log("💰 Delta Balance Raw:", balanceResponse);

//         // ✅ Send RAW response
//         return res.status(200).json(balanceResponse);

//     } catch (error: any) {
//         console.error("🔥 Error:", error.response?.data || error.message);
//         return res.status(500).json({
//             message: "Failed to fetch delta balance",
//             error: error.message,
//         });
//     }
// };

// export const getEquityChange = async (req: Request, res: Response) => {
//     try {
//         const userId = req.query.userId as string;
//         if (!userId) {
//             return res.status(400).json({ message: "Missing userId" });
//         }

//         console.log("🔍 Fetching Delta credentials for user (equity change):", userId);

//         // Fetch keys
//         const creds = await ExchangeCredential.findOne({
//             userId: new mongoose.Types.ObjectId(userId),
//             exchange: "delta",
//         });

//         if (!creds) {
//             return res.status(404).json({ message: "No Delta API credentials found" });
//         }

//         const apiKey = decryptText(creds.apiKey_enc);
//         const apiSecret = decryptText(creds.apiSecret_enc);

//         console.log("🔐 Keys decrypted!");

//         // Fetch equity change from Delta
//         const equityResponse = await fetchEquityChange(apiKey, apiSecret);

//         console.log("📈 Delta Equity Change Raw:", equityResponse);

//         // ✅ Send RAW response
//         return res.status(200).json(equityResponse);

//     } catch (error: any) {
//         console.error("🔥 Error fetching equity change:", error.response?.data || error.message);
//         return res.status(500).json({
//             message: "Failed to fetch delta equity change",
//             error: error.message,
//         });
//     }
// };

import type { Response } from "express";
import ExchangeCredential from "../models/ExchangeCredential.js";
import { decryptText } from "../utils/crypto.js";
import { fetchDeltaBalance, fetchEquityChange } from "../exchanges/delta.js";
import type { AuthRequest } from "../middlewares/authMiddleware.js";

/**
 * ✅ GET /api/delta/balance
 * JWT based (NO userId query)
 */
export const getDeltaBalance = async (req: AuthRequest, res: Response) => {
    try {
        const authId = req.user?.authId;

        if (!authId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        console.log("🔍 Fetching Delta credentials for authId:", authId);

        const creds = await ExchangeCredential.findOne({
            authId,
            exchange: "delta",
        });

        if (!creds) {
            return res.status(404).json({
                message: "Delta exchange not connected for user",
            });
        }

        const apiKey = decryptText(creds.apiKey_enc);
        const apiSecret = decryptText(creds.apiSecret_enc);

        const balanceResponse = await fetchDeltaBalance(apiKey, apiSecret);

        return res.status(200).json(balanceResponse);
    } catch (error: any) {
        console.error("🔥 Error fetching delta balance:", error.message);
        return res.status(500).json({
            message: "Failed to fetch delta balance",
            error: error.message,
        });
    }
};

/**
 * ✅ GET /api/delta/equity_change
 * JWT based (NO userId query)
 */
export const getEquityChange = async (req: AuthRequest, res: Response) => {
    try {
        const authId = req.user?.authId;

        if (!authId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        console.log("🔍 Fetching Delta credentials (equity) for authId:", authId);

        const creds = await ExchangeCredential.findOne({
            authId,
            exchange: "delta",
        });

        if (!creds) {
            return res.status(404).json({
                message: "Delta exchange not connected for user",
            });
        }

        const apiKey = decryptText(creds.apiKey_enc);
        const apiSecret = decryptText(creds.apiSecret_enc);

        const equityResponse = await fetchEquityChange(apiKey, apiSecret);

        return res.status(200).json(equityResponse);
    } catch (error: any) {
        console.error("🔥 Error fetching equity change:", error.message);
        return res.status(500).json({
            message: "Failed to fetch delta equity change",
            error: error.message,
        });
    }
};
