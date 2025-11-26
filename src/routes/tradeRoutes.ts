import express from "express";
import { getActiveTrades } from "../controllers/tradecontrollers.js";
import { getDeltaBalance } from "../controllers/deltaController.js";

const router = express.Router();

// ✅ Route: Fetch active trades from Delta
router.get("/Activetrades", getActiveTrades);
router.get("/delta/balance", getDeltaBalance);


export default router;
