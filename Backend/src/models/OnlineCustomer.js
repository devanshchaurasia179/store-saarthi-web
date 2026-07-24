import mongoose from "mongoose";

/* =========================================================
   ONLINE CUSTOMER MODEL
   - Global customers who order via QR scan
   - Separate from shop-scoped "Customer" (billing/ledger)
========================================================= */

const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: "Home",
    },
    fullAddress: {
      type: String,
      required: true,
      trim: true,
    },
    houseNumber: {
      type: String,
      trim: true,
      default: "",
    },
    landmark: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    pincode: {
      type: String,
      trim: true,
      default: "",
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const onlineCustomerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    /* OTP fields */
    otp: {
      type: String,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      select: false,
    },

    addresses: {
      type: [addressSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const OnlineCustomer = mongoose.model("OnlineCustomer", onlineCustomerSchema);
export default OnlineCustomer;
