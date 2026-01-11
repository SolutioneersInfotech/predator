import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { getNews, getSignals, getSummary } from "../controllers/analysisController.js";
import { checkRateLimit } from "../utils/rateLimiter.js";

const analysisRoutes = Router();

const LIMIT = 30;
const WINDOW_MS = 60 * 1000;

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
  const { allowed, remaining, resetAt } = checkRateLimit(`analysis:${ip}`, LIMIT, WINDOW_MS);

  res.setHeader("X-RateLimit-Limit", LIMIT.toString());
  res.setHeader("X-RateLimit-Remaining", remaining.toString());
  res.setHeader("X-RateLimit-Reset", resetAt.toString());

  if (!allowed) {
    return res.status(429).json({ success: false, error: "Rate limit exceeded. Please retry shortly." });
  }

  next();
}

analysisRoutes.get("/signals/:symbol", rateLimitMiddleware, getSignals);
analysisRoutes.get("/news/:symbol", rateLimitMiddleware, getNews);
analysisRoutes.get("/summary", rateLimitMiddleware, getSummary);

export default analysisRoutes;
