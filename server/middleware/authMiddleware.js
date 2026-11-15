import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    const authorization = req.headers.authorization;
    const tokenMatch = authorization?.match(/^Bearer\s+(\S+)$/i);

    if (!tokenMatch) {
        return res.status(401).json({
            message: "Authentication token is required."
        });
    }

    let decoded;
    try {
        decoded = jwt.verify(tokenMatch[1], process.env.JWT_SECRET, {
            algorithms: ["HS256"]
        });
    } catch {
        return res.status(401).json({ message: "Invalid or expired token." });
    }

    if (typeof decoded === "string" || typeof decoded.userId !== "string") {
        return res.status(401).json({ message: "Invalid or expired token." });
    }

    req.user = { userId: decoded.userId };
    return next();
};

export default authMiddleware;