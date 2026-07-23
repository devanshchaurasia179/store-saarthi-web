import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getShopOrders,
  getShopOrderById,
  acceptOrder,
  rejectOrder,
  updateOrderItems,
  updateOrderStatus,
  createBillFromOrderEndpoint,
} from "../controllers/shopOrder.controller.js";

const router = express.Router();

/* ================= SHOP OWNER ORDER MANAGEMENT ================= */
// All routes use existing shop owner protectRoute middleware

router.get("/", protectRoute, getShopOrders);
router.get("/:id", protectRoute, getShopOrderById);
router.patch("/:id/accept", protectRoute, acceptOrder);
router.patch("/:id/reject", protectRoute, rejectOrder);
router.patch("/:id/update-items", protectRoute, updateOrderItems);
router.patch("/:id/status", protectRoute, updateOrderStatus);
router.post("/:id/create-bill", protectRoute, createBillFromOrderEndpoint);

export default router;
