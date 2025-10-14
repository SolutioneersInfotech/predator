

// routes/exchange.routes.ts
import { Router } from "express";
import ExchangeCredential from "../models/ExchangeCredential.js";
import { encryptText } from "../utils/crypto.js";
import { verifyBinanceCredentials, verifyDeltaCredentials } from "../services/exchangeVerifiers.js";
import mongoose from "mongoose";
const router = Router();

// POST /api/exchange/connect
router.post("/connect", async (req: any, res) => {
    try {
        // ✅ temporary dummy ObjectId for testing
        const userId = new mongoose.Types.ObjectId();
        // Ensure JSON body is parsed
        const { exchange, apiKey, apiSecret, passphrase } = req.body;

        console.log("Request body:", req.body);

        if (!exchange || !apiKey || !apiSecret) {
            return res.status(400).json({ error: "Missing fields" });
        }

        // Verify API credentials
        let ok = false;
        if (exchange === "binance") {
            ok = await verifyBinanceCredentials(apiKey, apiSecret);
        } else if (exchange === "delta") {
            ok = await verifyDeltaCredentials(apiKey, apiSecret, true); // true = Testnet
        }

        if (!ok) {
            return res.status(400).json({ error: "Invalid credentials or verification failed" });
        }

        // Save encrypted credentials
        await ExchangeCredential.findOneAndUpdate(
            { userId, exchange },
            {
                apiKey_enc: encryptText(apiKey),
                apiSecret_enc: encryptText(apiSecret),
                passphrase_enc: passphrase ? encryptText(passphrase) : undefined,
            },
            { upsert: true, new: true }
        );

        return res.json({ success: true, message: `${exchange} connected successfully` });
    } catch (err: any) {
        console.error("connect route error:", err?.response?.data || err.message || err);
        return res.status(500).json({ error: err.message || "Server error" });
    }
});

// GET /api/exchange/list
router.get("/list", async (req: any, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(); // ✅ temporary dummy ObjectId for testing
        console.log("Fetching exchange list for userId:", userId);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const creds = await ExchangeCredential.find({ userId }).select(
            "-apiKey_enc -apiSecret_enc -passphrase_enc"
        );
        return res.json(creds);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;
