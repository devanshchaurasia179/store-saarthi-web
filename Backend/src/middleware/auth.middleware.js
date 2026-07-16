import jwt from "jsonwebtoken";
import Shop from "../models/Shop.js";

export const protectRoute = async (req, res, next) => {
  try {
    let token;

    // 1️⃣ Try Bearer token (Mobile / Postman)
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2️⃣ Fallback to Cookie (Web)
    if (!token && req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized - Access token required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const shop = await Shop.findById(decoded.shopId);

    if (!shop) {
      return res.status(401).json({
        message: "Unauthorized - Shop not found",
      });
    }

    req.user = shop;
    next();
  } catch (error) {
    console.log("Error in protectRoute middleware", error);
    return res.status(401).json({
      message: "Unauthorized - Invalid or expired token",
    });
  }
};
