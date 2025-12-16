// import { Router } from "express";
// import type { Request, Response } from "express";
// import User from "../models/user.model.js";

// const router = Router();

// // 🔥 Sync user from Auth Service
// router.post("/sync", async (req: Request, res: Response) => {
//     console.log("🔥 SYNC BODY:", req.body); // <---- ADD THIS
//     try {
//         const { email, firstName, lastName, authId } = req.body;

//         if (!email) {
//             return res.status(400).json({ message: "Email is required" });
//         }

//         // Step 1: Check if user exists
//         let user = await User.findOne({ email });

//         // Step 2: Create new user if not exists
//         if (!user) {
//             user = await User.create({
//                 email,
//                 firstName: firstName || "",
//                 lastName: lastName || "",
//                 authId,
//             });
//         } else {
//             // Step 3: Sync user details if already exists
//             user.firstName = firstName || user.firstName;
//             user.lastName = lastName || user.lastName;
//             user.authId = authId;
//             await user.save();
//         }

//         return res.json({ success: true, user });
//     } catch (err: any) {
//         return res.status(500).json({
//             message: "Server error",
//             error: err.message,
//         });
//     }
// });

// export default router;



import { Router } from "express";
import type { Response } from "express";
import User from "../models/user.model.js";
import { verifyAuth } from "../middlewares/authMiddleware.js";
import type { AuthRequest } from "../middlewares/authMiddleware.js";

const router = Router();

/**
 * 🔥 Sync user from Auth Service (JWT based)
 * POST /api/user/sync
 */
router.post(
    "/sync",
    verifyAuth("Bitbot1"), // 🔐 AUTH REQUIRED
    async (req: AuthRequest, res: Response) => {
        try {
            console.log("🔥 SYNC BODY:", req.body);

            // 🔥 authId JWT se aaya
            const authId = req.user?.authId;
            const { email, firstName, lastName } = req.body;

            if (!authId || !email) {
                return res.status(400).json({ message: "Invalid user data" });
            }

            // 🔥 UPSERT using authId (not email)
            const user = await User.findOneAndUpdate(
                { authId },
                {
                    authId,
                    email,
                    firstName: firstName ?? "",
                    lastName: lastName ?? "",
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                }
            );

            return res.json({ success: true, user });
        } catch (err: any) {
            console.error("❌ User sync error:", err);
            return res.status(500).json({
                message: "Server error",
                error: err.message,
            });
        }
    }
);

export default router;
