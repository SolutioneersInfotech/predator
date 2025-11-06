import express from "express";
import { getActiveTrades } from "../controllers/tradecontrollers.js";

const router = express.Router();

// ✅ Route: Fetch active trades from Delta
router.get("/Activetrades", getActiveTrades);

export default router;
