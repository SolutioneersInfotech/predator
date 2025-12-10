import express from "express";
import { getPlatformMetrics } from "../controllers/platformMetricsController.js";

const router = express.Router();

router.get("/", getPlatformMetrics);

export default router;
