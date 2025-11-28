import { Router } from "express";
// ✅ TS-safe import for Mongoose Model
import ExchangeCredential from "../models/ExchangeCredential.js";
import { encryptText } from "../utils/crypto.js";
import { verifyDeltaCredentials } from "../services/exchangeVerifiers.js";
import { verifyAuth } from "../middlewares/authMiddleware.js"; // middleware import
import { Types } from "mongoose";

const router = Router();

// ✅ POST /api/exchange/connect
router.post("/connect", verifyAuth("Bitbot1"), async (req: any, res) => {
    try {
        const userId = new Types.ObjectId(req.user.userId as string); // userId from JWT
        const { exchange, apiKey, apiSecret, passphrase } = req.body;
        console.log("Connect request body:", req.body);

        if (!exchange || !apiKey || !apiSecret) {
            return res.status(400).json({ error: "Missing fields" });
        }

        // ✅ Delta-only verification
        const ok = await verifyDeltaCredentials(apiKey, apiSecret, true);
        if (!ok) {
            return res.status(400).json({ error: "Invalid credentials or verification failed" });
        }

        // Save encrypted credentials
        await (ExchangeCredential.findOneAndUpdate(
            { userId, exchange },
            {
                apiKey_enc: encryptText(apiKey),
                apiSecret_enc: encryptText(apiSecret),
                passphrase_enc: passphrase ? encryptText(passphrase) : undefined,
            },
            { upsert: true, new: true }
        ) as any).exec();

        return res.json({ success: true, message: `${exchange} connected successfully` });
    } catch (err: any) {
        console.error("connect route error:", err?.response?.data || err.message || err);
        return res.status(500).json({ error: err.message || "Server error" });
    }
});

// ✅ GET /api/exchange/list
router.get("/list", verifyAuth("Bitbot1"), async (req: any, res) => {
    try {
        const userId = new Types.ObjectId(req.user.userId as string); // userId from JWT

        const creds = await (ExchangeCredential.find({ userId })
            .select("-apiKey_enc -apiSecret_enc -passphrase_enc") as any).exec();

        return res.json(creds);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;


