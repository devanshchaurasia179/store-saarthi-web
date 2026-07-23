import express from "express";
import { protectCustomerRoute } from "../middleware/customerAuth.middleware.js";
import {
  createOrder,
  getOrderById,
  getCustomerOrders,
  cancelOrder,
} from "../controllers/order.controller.js";

const router = express.Router();

/* ================= CUSTOMER ORDER APIs ================= */
// All routes require customer authentication

router.post("/", protectCustomerRoute, createOrder);
router.get("/", protectCustomerRoute, getCustomerOrders);
router.get("/:id", protectCustomerRoute, getOrderById);
router.patch("/:id/cancel", protectCustomerRoute, cancelOrder);

export default router;
