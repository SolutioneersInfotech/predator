import { Router } from "express";
import type { Request } from "express";
import { executeOrderForUser } from "../services/tradeExecutor.js";
import { fetchDeltaProducts } from "../exchanges/delta.js";
import { verifyAuth } from "../middlewares/authMiddleware.js";

const router = Router();

// 🟢 Allowed project ID (token me stored projectId)
const PROJECT_ID = "Bitbot1";

/**
 * Fetch last price for a symbol. This tries to read a price from fetchDeltaProducts if available,
 * otherwise falls back to 0 so the caller can proceed (or handle zero appropriately).
 */
async function fetchLastPrice(symbol: string): Promise<number> {
    try {
        const deltaProducts: any = await fetchDeltaProducts();
        const entry = deltaProducts?.[symbol];
        if (entry != null) {
            // If the entry is an object, try common price fields
            if (typeof entry === "object") {
                const lp = (entry as any).last_price ?? (entry as any).lastPrice ?? (entry as any).price;
                if (lp != null) return Number(lp);
            }
            // If the entry is a primitive (e.g., product id), no price available
        }
    } catch (e) {
        // ignore and fall through to fallback
        console.warn("fetchLastPrice: unable to read last price from delta products", e);
    }

    // Fallback value to avoid breaking execution; caller should validate/result accordingly.
    return 0;
}

router.post("/execute", verifyAuth(PROJECT_ID), async (req: Request & { user?: { authId?: string } }, res) => {

    try {
        const userId = req.user?.authId;

        if (!userId) {
            return res.status(401).json({ message: "User not found in token" });
        }

        const { exchange, symbol, side, quantity, price, type } = req.body;

        if (!exchange || !symbol || !side || !quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!["BUY", "SELL"].includes(side.toUpperCase())) {
            return res.status(400).json({ error: "Invalid side" });
        }

        if (Number(quantity) <= 0) {
            return res.status(400).json({ error: "Quantity must be positive" });
        }

        // BTC/USDT -> BTCUSD
        let formattedSymbol = symbol.toUpperCase().replace("/", "");
        if (formattedSymbol.endsWith("T")) {
            formattedSymbol = formattedSymbol.slice(0, -1); // last character remove
        }

        console.log("Formatted Symbol:", formattedSymbol);

        // 🔥 Fetch delta products from DB/API
        const deltaProducts = await fetchDeltaProducts();
        const product_id = deltaProducts[formattedSymbol];

        if (!product_id) {
            return res.status(400).json({ error: `Symbol ${symbol} not supported` });
        }

        let orderType: "LIMIT" | "MARKET" = "MARKET";
        let orderPrice: number | undefined = undefined;

        if (price) {
            // Agar user ne price diya to LIMIT order
            orderType = "LIMIT";
            orderPrice = Number(price);
        } else {
            // Agar market order bhejna hai to GTC/Limit approximation ke liye last price + small offset
            // Taaki order open rahe aur active positions me show ho
            const lastPrice = await fetchLastPrice(formattedSymbol); // aapko ye function create karna hoga
            orderType = "LIMIT";
            // BUY ke liye slightly upar, SELL ke liye slightly neeche
            orderPrice = side.toUpperCase() === "BUY" ? lastPrice * 1.001 : lastPrice * 0.999;
        }

        const orderRequest = {
            authId: String(userId),

            exchange,
            symbol: formattedSymbol,
            side: side.toUpperCase(),
            quantity: Number(quantity),
            price: orderPrice,
            type: orderType,
            product_id: Number(product_id)
        };

        console.log("🚀 Executing Order:", orderRequest);

        const result = await executeOrderForUser(orderRequest);

        return res.json({ success: true, result });

    } catch (err) {
        console.error("Trade execution error:", err);
        res.status(500).json({ error: err.message || "Trade execution failed" });
    }
});

export default router;


