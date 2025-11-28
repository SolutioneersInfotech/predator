import type { Request, Response } from "express";
import mongoose from "mongoose";
import ExchangeCredential from "../models/ExchangeCredential.js";
import { decryptText } from "../utils/crypto.js";
import {
    fetchDeltaOrderHistory,
    fetchDeltaFillsHistory,
} from "../exchanges/delta.js";

/**
 * 🔐 Helper: Fetch & Decrypt Delta API Keys
 */
const getDeltaCreds = async (userId: string) => {
    const creds = await ExchangeCredential.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        exchange: "delta",
    });

    if (!creds) {
        throw new Error("No Delta API credentials found");
    }

    return {
        apiKey: decryptText(creds.apiKey_enc),
        apiSecret: decryptText(creds.apiSecret_enc),
    };
};


/**
 * 📌 Fetch Delta Order History
 */
export const getDeltaOrders = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;   // ✅ FIXED
        console.log("userId", userId);


        if (!userId) {
            return res.status(400).json({ message: "Missing userId" });
        }

        console.log("📝 Fetching Delta Order History for user:", userId);

        const { apiKey, apiSecret } = await getDeltaCreds(userId);

        const result = await fetchDeltaOrderHistory(apiKey, apiSecret);

        console.log("📌 Delta Orders Response:", result);

        return res.status(200).json({
            success: true,
            orders: result.result || [],
        });

    } catch (error: any) {
        console.error("❌ Order History Error:", error.message);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};


/**
 * 📌 Fetch Delta Fills (Trade History)
 */
export const getDeltaFills = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;   // ✅ FIXED
        console.log("userId", userId);

        if (!userId) {
            return res.status(400).json({ message: "Missing userId" });
        }

        console.log("📝 Fetching Delta Fills History for user:", userId);

        const { apiKey, apiSecret } = await getDeltaCreds(userId);

        const result = await fetchDeltaFillsHistory(apiKey, apiSecret);

        console.log("📌 Delta Fills Response:", result);

        return res.status(200).json({
            success: true,
            fills: result.result || [],
        });

    } catch (error: any) {
        console.error("❌ Fills History Error:", error.message);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};
