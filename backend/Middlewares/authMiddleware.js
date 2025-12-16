import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
    const token = req.cookies["token"];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Forbidden" });
        req.user = user;
        next();
    });
};