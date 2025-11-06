// import { Router } from "express";
// import { executeOrderForUser } from "../services/tradeExecutor.js";
// import { fetchDeltaProducts } from "../exchanges/delta.js";

// const router = Router();

// /**
//  * ✅ Fetch product list from Delta
//  * Use this to find correct product_id before placing an order
//  */
// router.get("/delta-products", async (req, res) => {
//     try {
//         const data = await fetchDeltaProducts();

//         // If your delta.ts returns a map, convert it to array for clarity
//         const products = Object.entries(data).map(([symbol, id]) => ({ symbol, id }));

//         console.log("📜 Delta Product List:");
//         products.slice(0, 10).forEach((p) => console.log(`➡️ ${p.symbol} — ${p.id}`));

//         res.json({
//             count: products.length,
//             products,
//         });
//     } catch (err: any) {
//         console.error("❌ Failed to fetch Delta products:", err.message);
//         res.status(500).json({ error: err.message });
//     }
// });

// /**
//  * ✅ Test placing an order on Delta Exchange manually
//  */
// router.post("/test-delta-order", async (req, res) => {
//     try {
//         const { userId, product_id, symbol, side, quantity, price } = req.body;

//         if (!userId || !symbol || !side || !quantity || !product_id) {
//             return res.status(400).json({ error: "Missing required fields" });
//         }

//         // Execute the order
//         const result = await executeOrderForUser({
//             userId,
//             exchange: "delta",
//             symbol,
//             side: side.toUpperCase() === "BUY" ? "BUY" : "SELL",
//             quantity: Number(quantity),
//             price: price ? Number(price) : undefined,
//             type: price ? "LIMIT" : "MARKET",
//             product_id: Number(product_id),
//         });

//         res.json({ success: true, result });
//     } catch (err: any) {
//         console.error("❌ Test order error:", err.message);
//         res.status(500).json({ error: err.message });
//     }
// });

// export default router;

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

/**
 * ✅ Test placing an order on Delta Exchange manually
 */
router.post("/test-delta-order", async (req, res) => {
    try {
        const { userId, product_id, side, quantity, price } = req.body;

        if (!userId || !side || !quantity || !product_id) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const isLimit = !!price;

        const orderType = isLimit ? "limit_order" : "market_order";
        const limitPrice = isLimit ? Number(price) : undefined;

        console.log("🚀 Sending Order →", {
            product_id,
            side,
            size: quantity,
            order_type: orderType,
            ...(limitPrice ? { limit_price: limitPrice } : {}),
        });

        const result = await executeOrderForUser({
            userId,
            exchange: "delta",
            symbol: "BTCUSD", // optional, for logging
            side: side.toUpperCase() === "BUY" ? "BUY" : "SELL",
            quantity: Number(quantity),
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

