import jwt from "jsonwebtoken";
import OnlineCustomer from "../models/OnlineCustomer.js";

/* =========================================================
   CUSTOMER AUTH MIDDLEWARE
   - Separate from shop owner protectRoute
   - Verifies JWT for online customers (QR ordering)
========================================================= */

export const protectCustomerRoute = async (req, res, next) => {
  try {
    let token;

    // Bearer token (mobile app)
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Fallback: customer_jwt cookie (web)
    if (!token && req.cookies?.customer_jwt) {
      token = req.cookies.customer_jwt;
    }

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized - Access token required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Ensure this is a customer token (not a shop token)
    if (!decoded.customerId) {
      return res.status(401).json({
        message: "Unauthorized - Invalid token type",
      });
    }

    const customer = await OnlineCustomer.findById(decoded.customerId);

    if (!customer) {
      return res.status(401).json({
        message: "Unauthorized - Customer not found",
      });
    }

    if (!customer.isPhoneVerified) {
      return res.status(401).json({
        message: "Unauthorized - Phone not verified",
      });
    }

    req.customer = customer;
    next();
  } catch (error) {
    console.log("Error in protectCustomerRoute middleware", error.message);
    return res.status(401).json({
      message: "Unauthorized - Invalid or expired token",
    });
  }
};
