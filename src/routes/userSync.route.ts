import { Router } from "express";
import type { Request, Response } from "express";
import User from "../models/user.model.js";

const router = Router();

// 🔥 Sync user from Auth Service
router.post("/sync", async (req: Request, res: Response) => {
    console.log("🔥 SYNC BODY:", req.body); // <---- ADD THIS
    try {
        const { email, firstName, lastName, authId } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Step 1: Check if user exists
        let user = await User.findOne({ email });

        // Step 2: Create new user if not exists
        if (!user) {
            user = await User.create({
                email,
                firstName: firstName || "",
                lastName: lastName || "",
                authId,
            });
        } else {
            // Step 3: Sync user details if already exists
            user.firstName = firstName || user.firstName;
            user.lastName = lastName || user.lastName;
            user.authId = authId;
            await user.save();
        }

        return res.json({ success: true, user });
    } catch (err: any) {
        return res.status(500).json({
            message: "Server error",
            error: err.message,
        });
    }
});

export default router;
