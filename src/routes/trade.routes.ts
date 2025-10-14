// routes/trade.routes.ts
import { Router } from "express";
import { executeOrderForUser } from "../services/tradeExecutor.js";

const router = Router();

// POST /api/trade/execute
// body: { exchange, symbol, side, quantity, price?, type? }
router.post("/execute", async (req: any, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { exchange, symbol, side, quantity, price, type } = req.body;
        if (!exchange || !symbol || !side || !quantity) return res.status(400).json({ error: "Missing fields" });

        const result = await executeOrderForUser({
            userId: String(userId),
            exchange,
            symbol,
            side,
            quantity: Number(quantity),
            price: price ? Number(price) : undefined,
            type,
        });

        // TODO: log result in DB (trade log)

        return res.json({ success: true, result });
    } catch (err: any) {
        console.error("trade execute error", err);
        return res.status(500).json({ error: err.message || "Trade execution failed" });
    }
});

export default router;
