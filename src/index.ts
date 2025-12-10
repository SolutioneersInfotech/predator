import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import http from "http";
import { startWebSocketServer } from "./ws/wsServer.js";

import mongoose from "mongoose";
import strategyRouter from "./routes/strategy.routes.js";
import commodityRoutes from "./routes/commodityRoutes.js";
import exchangeRouter from "./routes/exchange.routes.js";
import tradeRouter from "./routes/trade.routes.js";
import { verifyAuth } from "./middlewares/authMiddleware.js";
import botRoutes from "./routes/botRoutes.js";
import tradeRoutes from "./routes/tradeRoutes.js";
import userSyncRoutes from "./routes/userSync.route.js";

import testDeltaRoutes from "./routes/testdelta.routes.js"

import syncdeltaProducts from "./routes/DeltaProductRoute.js";
import { botManager } from "./Bot/botManager.js";
import platformMetricsRoutes from "./routes/platformMetricsRoutes.js";



// dotenv.config();
console.log("MASTER_KEY is:", process.env.MASTER_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tradingBot";
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000, // 5 sec  timeout
        });
        console.log("✅ MongoDB Connected");
        //resume all bots on server start
        await botManager.resumeAllOnStartup();
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1);
    }
};

// Test route
app.get("/", (_req, res) => res.json({ message: "Predator API running" }));

// Routes
app.use("/api/strategy", verifyAuth("Bitbot1"), strategyRouter);
app.use("/api/commodities", verifyAuth("Bitbot1"), commodityRoutes);
app.use("/api/platform-metrics", platformMetricsRoutes);
app.use("/api/exchange", exchangeRouter);
app.use("/api/trade", tradeRouter);
app.use('/api/bots', botRoutes);
app.use("/api", tradeRoutes);

app.use("/api/test", testDeltaRoutes);

app.use("/api/user", userSyncRoutes);
app.use("/api/delta", syncdeltaProducts);

// app.use("/api/history", deltaHistoryRoutes);





// Start server after DB connection
const PORT = Number(process.env.PORT || 3000);
connectDB().then(() => {
    // Create HTTP server
    const server = http.createServer(app);

    // Start WebSocket server on same port
    startWebSocketServer(server);

    // Start Express HTTP server
    server.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`🔌 WebSocket running on ws://localhost:${PORT}`);
    });
});

