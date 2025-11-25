import express from "express";
import DeltaProduct from "../models/DeltaProduct.js";
import { fetchDeltaProducts } from "../exchanges/delta.js";

const router = express.Router();

router.get("/sync-delta-products", async (req, res) => {
    try {
        const productsMap = await fetchDeltaProducts();

        const entries = Object.entries(productsMap);

        for (const [symbol, product_id] of entries) {
            await DeltaProduct.findOneAndUpdate(
                { symbol },
                { symbol, product_id },
                { upsert: true }
            );
        }

        res.json({ success: true, count: entries.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;