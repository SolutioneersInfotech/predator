import { Router } from "express";
import { executeOrderForUser } from "../services/tradeExecutor.js";
import { fetchDeltaProducts } from "../exchanges/delta.js";

const router = Router();

/**
 * ✅ Fetch product list from Delta
 */
router.get("/delta-products", async (req, res) => {
    try {
        const data = await fetchDeltaProducts();
        const products = Object.entries(data).map(([symbol, id]) => ({ symbol, id }));

        console.log("📜 Delta Product List:");
        products.slice(0, 10).forEach((p) => console.log(`➡️ ${p.symbol} — ${p.id}`));

        res.json({ count: products.length, products });
    } catch (err) {
        console.error("❌ Failed to fetch Delta products:", err.message);
        res.status(500).json({ error: err.message });
    }
});

router.post("/test-delta-order", async (req, res) => {
    try {
        // 🔥 FIX: quantity → size
        const { userId, product_id, side, size, price } = req.body;

        // 🔥 FIX: check size instead of quantity
        if (!userId || !side || !size || !product_id) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const isLimit = !!price;

        const orderType = isLimit ? "limit_order" : "market_order";
        const limitPrice = isLimit ? Number(price) : undefined;

        console.log("🚀 Sending Order →", {
            product_id,
            side,
            size: size, // 🔥 FIX: size print karna
            order_type: orderType,
            ...(limitPrice ? { limit_price: limitPrice } : {}),
        });

        const result = await executeOrderForUser({
            userId,
            exchange: "delta",
            symbol: "BTCUSD",
            side: side.toUpperCase() === "BUY" ? "BUY" : "SELL",

            // 🔥 FIX: quantity = size
            quantity: Number(size),

            price: limitPrice,
            type: isLimit ? "LIMIT" : "MARKET",
            product_id: Number(product_id),
        });

        res.json({ success: true, result });
    } catch (err) {
        console.error("❌ Test order error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

export default router;

