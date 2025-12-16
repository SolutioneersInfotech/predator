// import jwt from "jsonwebtoken";

// export const verifyAuth = (allowedProjectId) => {
//     return (req, res, next) => {
//         try {
//             const authHeader = req.headers["authorization"];
//             if (!authHeader) {
//                 return res.status(401).json({ message: "No token provided" });
//             }

//             // Format: Bearer <token>
//             const token = authHeader.split(" ")[1];
//             const decoded = jwt.verify(token, process.env.JWT_SECRET);

//             // ✅ Project check
//             if (
//                 typeof decoded === "object" &&
//                 decoded !== null &&
//                 "projectId" in decoded &&
//                 (decoded as jwt.JwtPayload).projectId !== allowedProjectId
//             ) {
//                 return res.status(403).json({ message: "Invalid project access" });
//             }

//             req.user = decoded; // userId + projectId
//             next();
//         } catch (err) {
//             return res.status(401).json({ message: "Unauthorized" });
//         }
//     };
// };


// import jwt from "jsonwebtoken";
// import type { Request, Response, NextFunction } from "express";

// /**
//  * 🔥 Custom Request type
//  * Adds logged-in user info to req.user
//  */
// export interface AuthRequest extends Request {
//     user?: {
//         authId: string;
//         email?: string;
//         projectId?: string;
//     };
// }

// /**
//  * 🔐 JWT Authentication Middleware
//  */
// export const verifyAuth = (allowedProjectId?: string) => {
//     return (req: AuthRequest, res: Response, next: NextFunction) => {
//         try {
//             const authHeader = req.headers.authorization;

//             if (!authHeader || !authHeader.startsWith("Bearer ")) {
//                 return res.status(401).json({ message: "No token provided" });
//             }

//             const token = authHeader.split(" ")[1];
//             const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

//             // 🔥 authId must exist
//             if (!decoded.authId) {
//                 return res.status(401).json({ message: "Invalid token payload" });
//             }

//             // 🔐 Optional project check
//             if (allowedProjectId && decoded.projectId !== allowedProjectId) {
//                 return res.status(403).json({ message: "Invalid project access" });
//             }

//             // ✅ Attach safe user object
//             req.user = {
//                 authId: decoded.authId,
//                 email: decoded.email,
//                 projectId: decoded.projectId,
//             };

//             next();
//         } catch (err) {
//             return res.status(401).json({ message: "Unauthorized" });
//         }
//     };
// };


import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

export interface AuthRequest extends Request {
    user?: {
        authId: string;        // 🔥 unified ID
        email?: string;
        projectId?: string;
    };
}

export const verifyAuth = (allowedProjectId?: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ message: "No token provided" });
            }

            const token = authHeader.split(" ")[1];
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

            /**
             * 🔥 MAIN FIX
             * Support BOTH:
             * - authId (new style)
             * - userId (auth service current style)
             */
            const authId = decoded.authId || decoded.userId;

            if (!authId) {
                return res.status(401).json({ message: "Invalid token payload" });
            }

            // 🔐 Project validation
            if (allowedProjectId && decoded.projectId !== allowedProjectId) {
                return res.status(403).json({ message: "Invalid project access" });
            }

            // ✅ Attach unified user object
            req.user = {
                authId: authId.toString(), // always string
                email: decoded.email,
                projectId: decoded.projectId,
            };

            next();
        } catch (err) {
            return res.status(401).json({ message: "Unauthorized" });
        }
    };
};

