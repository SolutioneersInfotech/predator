// import type { Request, Response } from "express";
// import ccxt from "ccxt";
// import ExchangeCredential from "../models/ExchangeCredential.js";
// import { decryptText } from "../utils/crypto.js";

// /**
//  * ✅ GET /api/trades
//  * Fetch active trades (open positions) from Delta Exchange for the logged-in user
//  */
// export const getActiveTrades = async (req: Request, res: Response) => {
//     try {
//         const userId = req.query.userId as string;
//         if (!userId) {
//             return res.status(400).json({ message: "Missing userId" });
//         }

//         // ✅ 1. Fetch encrypted credentials from DB
//         const creds = await ExchangeCredential.findOne({ userId, exchange: "delta" });
//         if (!creds) {
//             return res.status(404).json({ message: "No Delta API credentials found" });
//         }


//         // ✅ 2. Decrypt the stored keys
//         const apiKey = decryptText(creds.apiKey_enc);
//         const apiSecret = decryptText(creds.apiSecret_enc);

//         // ✅ 3. Initialize Delta exchange client
//         const exchange = new ccxt.delta({
//             apiKey,
//             secret: apiSecret,
//             enableRateLimit: true,
//         });
//         console.log("Initialized Delta exchange client for user:", userId);

//         // ✅ 4. Fetch active positions
//         const positions = await exchange.fetchPositions();

//         // ✅ 5. Filter only active/open positions
//         const activePositions = positions.filter((pos: any) => pos.contractSize && pos.contractSize > 0);

//         // ✅ 6. Transform for frontend compatibility
//         const formatted = activePositions.map((pos: any) => ({
//             id: pos.id || pos.symbol,
//             symbol: pos.symbol,
//             type: pos.side?.toUpperCase(),
//             entryPrice: pos.entryPrice,
//             currentPrice: pos.markPrice,
//             pnl: pos.unrealizedPnl || 0,
//             status: "active",
//         }));
//         console.log(`Fetched ${formatted.length} active trades for user:`, userId);

//         return res.status(200).json(formatted);
//     } catch (error: any) {
//         console.error("Error fetching active trades:", error.message || error);
//         return res.status(500).json({
//             message: "Failed to fetch active trades",
//             error: error.message,
//         });
//     }
// };

import type { Request, Response } from "express";
import ccxt from "ccxt";
import mongoose from "mongoose";
import ExchangeCredential from "../models/ExchangeCredential.js";
import { decryptText } from "../utils/crypto.js";

/**
 * ✅ GET /api/Activetrades?userId=<id>
 * Fetch active/open positions from Delta Exchange for a given user.
 */
export const getActiveTrades = async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        if (!userId) {
            return res.status(400).json({ message: "Missing userId" });
        }

        console.log("🔍 Fetching Delta credentials for:", userId);

        // ✅ Convert userId properly
        const creds = await ExchangeCredential.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            exchange: "delta",
        });

        if (!creds) {
            console.log("❌ No credentials found for user:", userId);
            return res.status(404).json({ message: "No Delta API credentials found" });
        }

        console.log("✅ Credentials found. Decrypting...");
        const apiKey = decryptText(creds.apiKey_enc);
        const apiSecret = decryptText(creds.apiSecret_enc);

        console.log("🧩 Decrypted API Key:", apiKey);
        console.log("🧩 Decrypted API Secret:", apiSecret);

        // ✅ Initialize Delta Exchange client
        const exchange = new ccxt.delta({
            apiKey,
            secret: apiSecret,
            enableRateLimit: true,
            urls: {
                api: {
                    public: 'https://cdn-ind.testnet.deltaex.org',
                    private: 'https://cdn-ind.testnet.deltaex.org',
                },
            },
        });

        console.log("🌐 Using API endpoint:", exchange.urls.api);

        console.log("🔁 Fetching open positions...");
        const positions = await exchange.fetchPositions();

        // ✅ Filter active/open positions
        const activePositions = positions.filter(
            (pos: any) => pos.contractSize && pos.contractSize > 0
        );

        console.log(`✅ Found ${activePositions.length} active positions`);

        // ✅ Format data for frontend
        const formatted = activePositions.map((pos: any) => ({
            id: pos.id || pos.symbol,
            symbol: pos.symbol,
            type: pos.side?.toUpperCase() || "N/A",
            entryPrice: pos.entryPrice || 0,
            currentPrice: pos.markPrice || 0,
            pnl: pos.unrealizedPnl || 0,
            status: "active",
        }));

        return res.status(200).json(formatted);
    } catch (error: any) {
        console.error("🔥 Error fetching active trades:", error);
        return res.status(500).json({
            message: "Failed to fetch active trades",
            error: error.message,
        });
    }
};
