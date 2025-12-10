

import { Router } from "express";
import type { Request, Response } from "express";

import fetch from "node-fetch";
import { getIndicators } from "../controllers/indicatorsController.js";

const commodityRoutes = Router();

// ✅ Top 10 Cryptos (Yahoo Finance)
const commodityMap: Record<string, string> = {
    "Bitcoin": "BTC-USD",
    "Ethereum": "ETH-USD",
    "Tether": "USDT-USD",
    "BNB": "BNB-USD",
    "Solana": "SOL-USD",
    "XRP": "XRP-USD",
    "Dogecoin": "DOGE-USD",
    "Cardano": "ADA-USD",
    "Toncoin": "TON-USD",
    "Shiba Inu": "SHIB-USD",
};

// ✅ Define Yahoo Finance Response type
interface YahooFinanceResponse {
    chart?: {
        result?: {
            meta?: {
                regularMarketPrice?: number;
            };
        }[];
        error?: {
            code?: string;
            description?: string;
        };
    };
}

// ✅ GET /api/commodities (returns cryptos now)
commodityRoutes.get("/", async (req: Request, res: Response) => {
    try {
        const results: { name: string; symbol: string; price: number | null }[] =
            [];

        for (const [name, symbol] of Object.entries(commodityMap)) {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
            const response = await fetch(url);

            // 👇 Properly typed JSON
            const data: YahooFinanceResponse = await response.json();

            // 👇 Safely accessing data with optional chaining
            const price =
                data.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;

            results.push({ name, symbol, price });
        }

        res.json(results);
    } catch (error) {
        console.error("Error fetching cryptos:", error);
        res.status(500).json({ message: "Error fetching cryptos", error });
    }
});

commodityRoutes.get("/indicators/:symbol",getIndicators);

export default commodityRoutes;
