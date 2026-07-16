import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer, // 👈 ADD THIS
} from "../controllers/customer.controller.js";

const router = express.Router();

// CREATE CUSTOMER
router.post("/", protectRoute, createCustomer);

// GET ALL CUSTOMERS
router.get("/", protectRoute, getCustomers);

// GET SINGLE CUSTOMER
router.get("/:customerId", protectRoute, getCustomerById);

// ✅ UPDATE CUSTOMER (FIX)
router.put("/:customerId", protectRoute, updateCustomer);

export default router;
