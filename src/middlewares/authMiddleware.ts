import jwt from "jsonwebtoken";

export const verifyAuth = (allowedProjectId) => {
    return (req, res, next) => {
        try {
            const authHeader = req.headers["authorization"];
            if (!authHeader) {
                return res.status(401).json({ message: "No token provided" });
            }

            // Format: Bearer <token>
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // ✅ Project check
            if (
                typeof decoded === "object" &&
                decoded !== null &&
                "projectId" in decoded &&
                (decoded as jwt.JwtPayload).projectId !== allowedProjectId
            ) {
                return res.status(403).json({ message: "Invalid project access" });
            }

            req.user = decoded; // userId + projectId
            next();
        } catch (err) {
            return res.status(401).json({ message: "Unauthorized" });
        }
    };
};
