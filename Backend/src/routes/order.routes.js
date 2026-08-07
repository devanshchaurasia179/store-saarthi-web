import express from "express";
import { protectCustomerRoute } from "../middleware/customerAuth.middleware.js";
import {
  createOrder,
  createDineInOrder,
  getOrderById,
  getCustomerOrders,
  cancelOrder,
} from "../controllers/order.controller.js";
import {
  getUpiDetails,
  confirmUpiPayment,
} from "../controllers/payment.controller.js";

const router = express.Router();

/* ================= CUSTOMER ORDER APIs ================= */

// Public route - dine-in orders don't require auth
router.post("/dine-in", createDineInOrder);

// Protected routes - require customer authentication
router.post("/", protectCustomerRoute, createOrder);
router.get("/", protectCustomerRoute, getCustomerOrders);
router.get("/:id", protectCustomerRoute, getOrderById);
router.patch("/:id/cancel", protectCustomerRoute, cancelOrder);

// UPI payment routes (no payment gateway — direct bank transfer)
router.get("/:id/upi-details", protectCustomerRoute, getUpiDetails);
router.post("/:id/confirm-upi", protectCustomerRoute, confirmUpiPayment);

export default router;
