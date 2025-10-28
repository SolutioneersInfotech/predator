// // routes/trade.routes.ts
// import { Router } from "express";
// import { executeOrderForUser } from "../services/tradeExecutor.js";

// const router = Router();

// // POST /api/trade/execute
// // body: { exchange, symbol, side, quantity, price?, type? }
// router.post("/execute", async (req: any, res) => {
//     try {
//         const userId = req.user?._id;
//         if (!userId) return res.status(401).json({ error: "Unauthorized" });

//         const { exchange, symbol, side, quantity, price, type } = req.body;
//         if (!exchange || !symbol || !side || !quantity) return res.status(400).json({ error: "Missing fields" });

//         const result = await executeOrderForUser({
//             userId: String(userId),
//             exchange,
//             symbol,
//             side,
//             quantity: Number(quantity),
//             price: price ? Number(price) : undefined,
//             type,
//         });

//         // TODO: log result in DB (trade log)

//         return res.json({ success: true, result });
//     } catch (err: any) {
//         console.error("trade execute error", err);
//         return res.status(500).json({ error: err.message || "Trade execution failed" });
//     }
// });

// export default router;


// routes/trade.routes.ts
import { Router } from "express";
import { executeOrderForUser } from "../services/tradeExecutor.js";
import TradeLog from "../models/TradeLog.js"; // optional

const router = Router();

router.post("/execute", async (req: any, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { exchange, symbol, side, quantity, price, type } = req.body;
        if (!exchange || !symbol || !side || !quantity)
            return res.status(400).json({ error: "Missing required fields" });

        if (!["BUY", "SELL"].includes(side.toUpperCase()))
            return res.status(400).json({ error: "Invalid side. Must be BUY or SELL" });

        if (isNaN(Number(quantity)) || Number(quantity) <= 0)
            return res.status(400).json({ error: "Quantity must be a positive number" });

        const normalizedSymbol = symbol.replace("-", "").toUpperCase();

        const result = await executeOrderForUser({
            userId: String(userId),
            exchange,
            symbol: normalizedSymbol,
            side: side.toUpperCase() as "BUY" | "SELL",
            quantity: Number(quantity),
            price: price ? Number(price) : undefined,
            type: type ?? "MARKET",
        });

        // ✅ Log trade (optional)
        await TradeLog.create({
            userId,
            exchange,
            symbol: normalizedSymbol,
            side,
            quantity,
            price,
            type,
            response: result,
            createdAt: new Date(),
        });

        return res.json({ success: true, result });
    } catch (err: any) {
        console.error("trade execute error", err);
        return res.status(500).json({ error: err.message || "Trade execution failed" });
    }
});

export default router;
