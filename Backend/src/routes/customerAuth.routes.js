import express from "express";
import { protectCustomerRoute } from "../middleware/customerAuth.middleware.js";
import {
  customerSendOtp,
  customerVerifyOtp,
  customerGetProfile,
  customerUpdateProfile,
  customerAddAddress,
  customerUpdateAddress,
  customerDeleteAddress,
  customerLogout,
} from "../controllers/customerAuth.controller.js";

const router = express.Router();

/* ================= PUBLIC (no auth) ================= */
router.post("/send-otp", customerSendOtp);
router.post("/verify-otp", customerVerifyOtp);

/* ================= PROTECTED (customer JWT) ================= */
router.get("/me", protectCustomerRoute, customerGetProfile);
router.patch("/me", protectCustomerRoute, customerUpdateProfile);

/* ================= ADDRESSES ================= */
router.post("/addresses", protectCustomerRoute, customerAddAddress);
router.patch("/addresses/:addressId", protectCustomerRoute, customerUpdateAddress);
router.delete("/addresses/:addressId", protectCustomerRoute, customerDeleteAddress);

/* ================= SESSION ================= */
router.post("/logout", customerLogout);

export default router;
