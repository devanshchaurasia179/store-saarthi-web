import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createBill,
  getBills,
  getBillById,
} from "../controllers/bill.controller.js";

const router = express.Router();

router.post("/", protectRoute, createBill);
router.get("/", protectRoute, getBills);
router.get("/:billId", protectRoute, getBillById);
export default router;
