import Shop from "../models/Shop.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import admin from "../lib/firebaseAdmin.js";

/* ================= HELPERS ================= */

// Generate 6-digit OTP
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Generate JWT
function generateToken(shopId) {
  return jwt.sign(
    { shopId },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "365d" }
  );
}

// Generate SHORT secret key
function generateRawSecretKey(shopId) {
  const hash = crypto
    .createHash("sha256")
    .update(shopId)
    .digest("hex");

  return `SS-${hash.substring(0, 8).toUpperCase()}`;
}

/* =====================================================
   FIREBASE PHONE AUTH LOGIN
   - Verifies the Firebase ID token from the mobile client
   - Finds or creates the Shop by phone number
   - Returns our own JWT for subsequent API calls
===================================================== */
export async function firebaseLogin(req, res) {
  try {
    const { firebaseIdToken } = req.body;

    if (!firebaseIdToken) {
      return res.status(400).json({ message: "Firebase ID token is required" });
    }

    // 1. Verify the ID token with Firebase Admin
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired Firebase token" });
    }

    // 2. Extract the phone number (Firebase stores it as +91XXXXXXXXXX)
    const phoneNumber = decodedToken.phone_number;
    if (!phoneNumber) {
      return res.status(400).json({ message: "No phone number in Firebase token" });
    }

    // Normalize: strip country code for storage, match existing records
    const mobileNumber = phoneNumber.replace(/^\+91/, "");

    // 3. Find or create Shop
    let shop = await Shop.findOne({ mobileNumber });
    if (!shop) {
      shop = await Shop.create({
        mobileNumber,
        shopName: "My Shop",
        ownerName: "Owner",
      });
    }

    // 4. Handle Secret Key (first-time login)
    let rawSecretKey = null;
    const shopWithSecret = await Shop.findById(shop._id).select("+secretKey");
    if (!shopWithSecret.secretKey) {
      rawSecretKey = generateRawSecretKey(shop._id.toString());
      shopWithSecret.secretKey = rawSecretKey;
      await shopWithSecret.save();
    }

    // 5. Generate JWT
    const token = generateToken(shop._id);

    // 6. Set cookie for web
    res.cookie("jwt", token, {
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    // 7. Respond
    res.status(200).json({
      success: true,
      token,
      shop,
      secretKey: rawSecretKey,
    });
  } catch (error) {
    console.error("Firebase Login Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

/* =====================================================
   SEND OTP (legacy email-based – kept for fallback)
===================================================== */
export async function sendOtp(req, res) {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    let shop = await Shop.findOne({ mobileNumber });

    if (!shop) {
      shop = await Shop.create({
        mobileNumber,
        shopName: "My Shop",
        ownerName: "Owner",
      });
    }

    const otp = generateOtp();
    shop.otp = otp;
    shop.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await shop.save();

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "devanshchaurasia2410@gmail.com",
        pass: process.env.NODEMAILER_PASS,
      },
    });

    await transporter.sendMail({
      from: '"Store Saathi OTP" <otp@storesaathi.dev>',
      to: "devanshshopsaathi@gmail.com",
      subject: "Your Store Saathi Login OTP",
      text: `Your OTP is ${otp}. Valid for 5 minutes.`,
    });

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

/* =====================================================
   VERIFY OTP & LOGIN
===================================================== */
export async function verifyOtp(req, res) {
  try {
    const { mobileNumber, otp } = req.body;

    if (!mobileNumber || !otp) {
      return res.status(400).json({
        message: "Mobile number and OTP required",
      });
    }

    // Include secretKey in the selection to check if it already exists
    const shop = await Shop.findOne({ mobileNumber })
      .select("+otp +otpExpiresAt +secretKey");

    if (!shop) {
      return res.status(404).json({ message: "shop not found" });
    }

    // 1. Verify the OTP using the model method
    const isValid = await shop.verifyOtp(otp);
    if (!isValid) {
      return res.status(401).json({
        message: "Invalid or expired OTP",
      });
    }

    // 2. Handle the Secret Key logic
    let rawSecretKey = null;
    
    // If the shop doesn't have a secret key yet (first time login), generate one
    if (!shop.secretKey) {
      rawSecretKey = generateRawSecretKey(shop._id.toString());
      shop.secretKey = rawSecretKey; 
      // Note: Your pre-save hook in the model will automatically hash this before saving
      await shop.save();
    }

    // 3. Generate Auth Token
    const token = generateToken(shop._id);

    // 4. Set Cookie (Web Support)
    res.cookie("jwt", token, {
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    // 5. Send Response
    res.status(200).json({
      success: true,
      token,               // For Mobile App / Postman
      shop,
      secretKey: rawSecretKey, // Will be null if already generated previously, or the string if new
    });
    
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

/* =====================================================
   LOGIN WITH SECRET KEY
===================================================== */
export async function loginWithSecretKey(req, res) {
  try {
    const { mobileNumber, secretKey } = req.body;

    if (!mobileNumber || !secretKey) {
      return res.status(400).json({
        message: "Mobile number and secret key are required",
      });
    }

    const shop = await Shop.findOne({ mobileNumber })
      .select("+secretKey");

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const isValid = await shop.verifySecretKey(secretKey);
    if (!isValid) {
      return res.status(401).json({
        message: "Invalid secret key",
      });
    }

    const token = generateToken(shop._id);

    // ✅ RESTORE COOKIE (WEB SUPPORT)
    res.cookie("jwt", token, {
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      token,   // 📱 App / Postman
      shop,
    });
  } catch (error) {
    console.error("Secret Login Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

/* =====================================================
   RESET SECRET KEY (via Analytics PIN)
===================================================== */
export async function resetSecretKey(req, res) {
  try {
    const shopId = req.user._id;
    const { analyticsPin } = req.body;

    if (!analyticsPin) {
      return res.status(400).json({
        message: "Analytics PIN is required",
      });
    }

    const shop = await Shop.findById(shopId)
      .select("+analyticsPin +secretKey");

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const isPinValid = await shop.verifyAnalyticsPin(analyticsPin);
    if (!isPinValid) {
      return res.status(401).json({
        message: "Invalid PIN",
      });
    }

    const rawSecret = generateRawSecretKey(shop._id.toString());
    const salt = await bcrypt.genSalt(10);
    shop.secretKey = await bcrypt.hash(rawSecret, salt);
    await shop.save();

    res.status(200).json({
      success: true,
      secretKey: rawSecret,
      message: "Secret key Ready to view",
    });
  } catch (error) {
    console.error("Reset Secret Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

/* =====================================================
   SET ANALYTICS PIN (FIRST TIME)
===================================================== */
export async function setAnalyticsPin(req, res) {
  try {
    const shopId = req.user._id;
    const { analyticsPin } = req.body;

    if (!analyticsPin) {
      return res.status(400).json({
        message: "Analytics PIN is required",
      });
    }

    const shop = await Shop.findById(shopId)
      .select("+analyticsPin");

    if (shop.analyticsPin) {
      return res.status(400).json({
        message: "Analytics PIN already set. Use update instead.",
      });
    }

    shop.analyticsPin = analyticsPin;
    await shop.save();

    res.status(200).json({
      success: true,
      message: "Analytics PIN set successfully",
    });
  } catch (error) {
    console.error("Set Analytics PIN Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
}
/* =====================================================
   VERIFY ANALYTICS PIN (UNLOCK ANALYTICS VIEW)
===================================================== */
export async function verifyAnalyticsPin(req, res) {
  try {
    const shopId = req.user._id;
    const { analyticsPin } = req.body;

    if (!analyticsPin) {
      return res.status(400).json({
        message: "Analytics PIN is required",
      });
    }

    const shop = await Shop.findById(shopId)
      .select("+analyticsPin");

    if (!shop || !shop.analyticsPin) {
      return res.status(404).json({
        message: "Analytics PIN not set",
      });
    }

    const isValid = await shop.verifyAnalyticsPin(analyticsPin);

    if (!isValid) {
      return res.status(401).json({
        message: "Invalid Analytics PIN",
      });
    }

    res.status(200).json({
      success: true,
      message: "Analytics unlocked",
    });
  } catch (error) {
    console.error("Verify Analytics PIN Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
}
/* =====================================================
   SEND OTP FOR ANALYTICS PIN RESET
===================================================== */
export async function sendAnalyticsPinResetOtp(req, res) {
  try {
    const shopId = req.user._id;
    const shop = await Shop.findById(shopId);

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const otp = generateOtp();
    shop.otp = otp;
    shop.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await shop.save();

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "devanshchaurasia2410@gmail.com",
        pass: process.env.NODEMAILER_PASS,
      },
    });

    await transporter.sendMail({
      from: '"Store Saathi Security" <security@storesaathi.dev>',
      to: "devanshshopsaathi@gmail.com",
      subject: "OTP to Reset Analytics PIN",
      text: `Your OTP to reset Analytics PIN is ${otp}. Valid for 5 minutes.`,
    });

    res.status(200).json({
      success: true,
      message: "OTPf108386a9063b9c8a614b8684fc6b4137ae8ff21 sent for PIN reset",
    });
  } catch (error) {
    console.error("Send PIN Reset OTP Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

/* =====================================================
   UPDATE ANALYTICS PIN
===================================================== */
export async function updateAnalyticsPin(req, res) {
  try {
    const shopId = req.user._id;
    const { oldPin, newPin } = req.body;

    if (!oldPin || !newPin) {
      return res.status(400).json({
        message: "Old PIN and New PIN are required",
      });
    }

    const shop = await Shop.findById(shopId)
      .select("+analyticsPin");

    const isValid = await shop.verifyAnalyticsPin(oldPin);
    if (!isValid) {
      return res.status(401).json({
        message: "Invalid old Analytics PIN",
      });
    }

    shop.analyticsPin = newPin;
    await shop.save();

    res.status(200).json({
      success: true,
      message: "PIN updated successfully",
    });
  } catch (error) {
    console.error("Update Analytics PIN Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
}
/* =====================================================
   VERIFY OTP & RESET ANALYTICS PIN (WITH LOCKOUT)
===================================================== */
export async function resetAnalyticsPinWithOtp(req, res) {
  try {
    const shopId = req.user._id;
    const { otp, newPin } = req.body;

    if (!otp || !newPin) {
      return res.status(400).json({
        message: "OTP and new PIN are required",
      });
    }

    const shop = await Shop.findById(shopId).select(
      "+otp +otpExpiresAt +analyticsPin +analyticsPinOtpAttempts +analyticsPinOtpBlockedUntil"
    );

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    /* ================= BLOCK CHECK ================= */
    if (
      shop.analyticsPinOtpBlockedUntil &&
      shop.analyticsPinOtpBlockedUntil > new Date()
    ) {
      const minutesLeft = Math.ceil(
        (shop.analyticsPinOtpBlockedUntil - Date.now()) / (1000 * 60)
      );

      return res.status(429).json({
        message: `Too many invalid attempts. Try again in ${minutesLeft} minutes.`,
      });
    }

    /* ================= OTP VERIFY ================= */
    const isValid = await shop.verifyOtp(otp);

    if (!isValid) {
      shop.analyticsPinOtpAttempts =
        (shop.analyticsPinOtpAttempts || 0) + 1;

      // 🚫 BLOCK AFTER 5 FAILURES
      if (shop.analyticsPinOtpAttempts >= 5) {
        shop.analyticsPinOtpBlockedUntil = new Date(
          Date.now() + 1 * 60 * 60 * 1000 // 6 hours
        );
        shop.analyticsPinOtpAttempts = 0; // reset counter after block
      }

      await shop.save();

      return res.status(401).json({
        message: "Invalid or expired OTP",
      });
    }

    /* ================= SUCCESS ================= */
    shop.analyticsPin = newPin;

    // ✅ Clear OTP + reset security counters
    shop.otp = undefined;
    shop.otpExpiresAt = undefined;
    shop.analyticsPinOtpAttempts = 0;
    shop.analyticsPinOtpBlockedUntil = undefined;

    await shop.save();

    res.status(200).json({
      success: true,
      message: "Analytics PIN reset successfully",
    });
  } catch (error) {
    console.error("Reset Analytics PIN Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
}



/* =====================================================
   ONBOARD SHOP
===================================================== */
export async function onboard(req, res) {
  try {
    const shopId = req.user._id;

    const {
      shopName,
      ownerName,
      gstNumber = "",
      storeCategory = "",
      upiId = "",
      location = "",
    } = req.body;

    if (!shopName || !ownerName) {
      return res.status(400).json({
        message: "Shop name and owner name are required",
      });
    }

    const completionFields = {
      shopName,
      ownerName,
      storeCategory,
      upiId,
      location,
    };

    const filledFields = Object.values(completionFields).filter(
      (v) => v && v.toString().trim() !== ""
    ).length;

    const profileCompletion = Math.round(
      (filledFields / Object.keys(completionFields).length) * 100
    );

    const shop = await Shop.findByIdAndUpdate(
      shopId,
      {
        shopName,
        ownerName,
        gstNumber,
        storeCategory,
        upiId,
        location,
        profileCompletion,
        isOnboarded: profileCompletion === 100,
      },
      { new: true }
    );

    res.status(200).json({ success: true, shop });
  } catch (error) {
    console.error("Onboarding Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/* =====================================================
   LOGOUT
===================================================== */
export function logout(req, res) {
  // Optional: clear cookie for web
  res.clearCookie("jwt");

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
}
