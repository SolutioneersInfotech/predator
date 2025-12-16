import express from "express";
import { getActiveTrades } from "../controllers/tradecontrollers.js";
import { getDeltaBalance, getEquityChange } from "../controllers/deltaController.js";
import { getDeltaOrders, getDeltaFills } from "../controllers/historyController.js";
import { verifyAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();
const PROJECT_ID = "Bitbot1";

// ✅ Route: Fetch active trades from Delta
router.get(
    "/active-trades",
    verifyAuth("Bitbot1"), // 🔐 project check
    getActiveTrades
);

router.get(
    "/delta/balance",
    verifyAuth("Bitbot1"),
    getDeltaBalance
);

router.get(
    "/delta/equity_change",
    verifyAuth("Bitbot1"),
    getEquityChange
);

router.get("/history/orders", verifyAuth(PROJECT_ID), getDeltaOrders);
router.get("/history/fills", verifyAuth(PROJECT_ID), getDeltaFills);
// router.get("/delta/equity_change", getEquityChange);


export default router;
