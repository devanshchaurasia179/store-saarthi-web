import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const shopSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */
    shopName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerName: {
      type: String,
      required: true,
      trim: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    gstNumber: {
      type: String,
      default: "",
      trim: true,
    },

    storeCategory: {
      type: String,
      default: "Kirana",
    },

    upiId: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      street: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      pincode: { type: String, trim: true, default: "" },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },

    /* ================= OTP AUTH ================= */
    otp: {
      type: String, // hashed
      select: false,
    },

    otpExpiresAt: {
      type: Date,
      select: false,
    },

    /* ================= SECURITY ================= */

    // 🔐 Analytics PIN
    analyticsPin: {
      type: String, // hashed
      select: false,
    },

    // 🔑 Short Secret Key (hashed, unique)
    secretKey: {
      type: String, // hashed
      select: false,
    },

    
analyticsPinOtpAttempts: {
  type: Number,
  default: 0,
  select: false,
},
analyticsPinOtpBlockedUntil: {
  type: Date,
  select: false,
},

    /* ================= STATUS ================= */
    isOnboarded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* =====================================================
   HELPERS
===================================================== */

// SHORT & UNIQUE secret key generator (8 chars)
function generateRawSecretKey(shopId) {
  const hash = crypto
    .createHash("sha256")
    .update(shopId)
    .digest("hex");

  return `SS-${hash.substring(0, 8).toUpperCase()}`;
}

/* =====================================================
   PRE-SAVE HOOK
===================================================== */
shopSchema.pre("save", async function () {
  // Hash OTP
  if (this.isModified("otp") && this.otp) {
    const salt = await bcrypt.genSalt(10);
    this.otp = await bcrypt.hash(this.otp, salt);
  }

  // Hash Analytics PIN
  if (this.isModified("analyticsPin") && this.analyticsPin) {
    const salt = await bcrypt.genSalt(10);
    this.analyticsPin = await bcrypt.hash(this.analyticsPin, salt);
  }

  // 🔑 Auto-generate Secret Key (only once)
  if (this.isNew && !this.secretKey) {
    const rawSecret = generateRawSecretKey(this._id.toString());
    const salt = await bcrypt.genSalt(10);
    this.secretKey = await bcrypt.hash(rawSecret, salt);

    // expose once (not stored in DB)
    this._rawSecretKey = rawSecret;
  }
});

/* =====================================================
   VERIFY METHODS
===================================================== */

// 🔐 Verify OTP
shopSchema.methods.verifyOtp = async function (enteredOtp) {
  if (!this.otp || !this.otpExpiresAt) return false;
  if (this.otpExpiresAt < new Date()) return false;

  const isValid = await bcrypt.compare(enteredOtp, this.otp);

  if (isValid) {
    this.otp = undefined;
    this.otpExpiresAt = undefined;
    await this.save();
  }

  return isValid;
};

// 🔢 Verify Analytics PIN
shopSchema.methods.verifyAnalyticsPin = async function (enteredPin) {
  if (!this.analyticsPin) return false;
  return bcrypt.compare(enteredPin, this.analyticsPin);
};

// 🔑 Verify Secret Key
shopSchema.methods.verifySecretKey = async function (enteredKey) {
  if (!this.secretKey) return false;
  return bcrypt.compare(enteredKey, this.secretKey);
};

const Shop = mongoose.model("Shop", shopSchema);
export default Shop;
