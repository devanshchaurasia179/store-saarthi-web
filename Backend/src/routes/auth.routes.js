import express from "express";
import Shop from "../models/Shop.js";

import {
  sendOtp,
  verifyOtp,
  loginWithSecretKey,
  resetSecretKey,
  setAnalyticsPin,
  verifyAnalyticsPin,
  updateAnalyticsPin,
  onboard,
  sendAnalyticsPinResetOtp,
  resetAnalyticsPinWithOtp,
  logout,
  firebaseLogin,
} from "../controllers/auth.controller.js";

import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ================= AUTH ================= */
router.post("/firebase-login", firebaseLogin);   // 🔥 Firebase Phone Auth (primary)
router.post("/send-otp", sendOtp);               // legacy email-based OTP
router.post("/verify-otp", verifyOtp);

// 🔑 Login via Secret Key (other devices)
router.post("/login-with-secret", loginWithSecretKey);

// 🔁 Reset / Regenerate Secret Key (via Analytics PIN)
router.post("/reset-secret", protectRoute, resetSecretKey);

/* ================= ANALYTICS PIN ================= */
router.post("/set-analytics-pin", protectRoute, setAnalyticsPin);
router.post("/update-analytics-pin", protectRoute, updateAnalyticsPin);
router.post("/verify-analytics-pin", protectRoute, verifyAnalyticsPin);

/* ================= ONBOARDING ================= */
router.post("/onboarding", protectRoute, onboard);

/* ================= SESSION ================= */
router.post("/logout", logout);

router.get("/me", protectRoute, async (req, res) => {
  try {
    const shop = await Shop.findById(req.user._id)
      .select("+analyticsPin"); // ✅ CRITICAL FIX

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const shopObj = shop.toObject();

    // 🔒 Remove sensitive fields
    delete shopObj.otp;
    delete shopObj.otpExpiresAt;
    delete shopObj.analyticsPin; // still remove from response
    delete shopObj.secretKey;
    delete shopObj.analyticsPinOtpAttempts;
    delete shopObj.analyticsPinOtpBlockedUntil;

    res.status(200).json({
      success: true,
      shop: {
        ...shopObj,
        hasAnalyticsPin: !!shop.analyticsPin, // ✅ NOW TRUE
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load profile" });
  }
});


router.post(
  "/analytics-pin/send-reset-otp",
  protectRoute,
  sendAnalyticsPinResetOtp
);

router.post(
  "/analytics-pin/reset-with-otp",
  protectRoute,
  resetAnalyticsPinWithOtp
);


export default router;
