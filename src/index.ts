
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import strategyRouter from "./routes/strategy.routes.js";
import commodityRoutes from "./routes/commodityRoutes.js";
import { verifyAuth } from "./middlewares/authMiddleware.js";


dotenv.config();

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
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1);
    }
};

// Test route
app.get("/", (_req, res) => res.json({ message: "Strategy API running" }));

// Routes

// app.use("/api/strategy", strategyRouter);
// app.use("/api/commodities", commodityRoutes);

app.use("/api/strategy", verifyAuth("Bitbot1"), strategyRouter);
app.use("/api/commodities", verifyAuth("Bitbot1"), commodityRoutes);



// Start server after DB connection
const PORT = Number(process.env.PORT || 3000);
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
});

