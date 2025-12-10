import { Router } from "express";
import type { Request, Response } from "express";
import { runMaCrossover } from "../services/strategy.service.js";
import { runRSIStrategy } from "../services/rsiService.js";
import { fetchCandlesFromBinance } from "../services/fetchCandles.js";

const router = Router()

// /api/candles/:commodity
router.get("/candles/:commodity", async (req: Request, res: Response) => {
    try {
        const { commodity } = req.params;
        const { interval = "1h", limit = "500" } = req.query;

        // ✅ Binance ya jo bhi tum use kar rahe ho waha se candles lao
        const candles = await fetchCandlesFromBinance(
            String(commodity),
            String(interval),
            Number(limit)
        );

        return res.json({ candles });
    } catch (err: any) {
        console.error("Candle fetch error:", err);
        return res.status(500).json({ error: err?.message || "Failed to fetch candles" });
    }
});

router.get("/:commodity/:strategyName", async (req: Request, res: Response) => {
    try {
        const { commodity, strategyName } = req.params;
        const { interval = "1h", limit = "500", sltype = "atr", slval } = req.query;

        if (!["ma-crossover", "sma50-200", "rsi"].includes(strategyName)) {
            return res.status(400).json({ error: "Unknown strategy" });
        }

        if (strategyName === "rsi") {
            try {
                const result = await runRSIStrategy(
                    String(commodity),
                    String(interval)
                );
                return res.json(result);
            } catch (err: any) {
                console.error("RSI strategy failed:", err?.message || err);
                return res.status(500).json({
                    error: err?.message || "RSI strategy failed"
                });
            }
        }

        // --- MA strategies ---
        const slMethod =
            sltype === "percent"
                ? { type: "percent" as const, value: Number(slval) || 0.5 }
                : { type: "atr" as const };

        const result = await runMaCrossover(
            String(commodity),
            String(interval),
            Number(limit)
        );

        return res.json(result);
    } catch (err: any) {
        console.error("Strategy route error:", err);
        return res.status(500).json({ error: err?.message || "Strategy failure" });
    }
});


export default router;