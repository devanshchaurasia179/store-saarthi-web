import mongoose from "mongoose";

/* =========================================================
   ONLINE PROFILE MODEL
   - One per shop — holds online store settings
   - Controls delivery, store display, ordering config
========================================================= */

const deliverySlotSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      required: true,
    },
    startTime: {
      type: String, // "09:00"
      required: true,
    },
    endTime: {
      type: String, // "12:00"
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const onlineProfileSchema = new mongoose.Schema(
  {
    /* ================= SHOP REFERENCE ================= */
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      unique: true,
      index: true,
    },

    /* ================= STORE DISPLAY INFO ================= */
    storeName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerName: {
      type: String,
      trim: true,
      default: "",
    },

    storeDescription: {
      type: String,
      trim: true,
      default: "",
    },

    storeLogo: {
      type: String, // URL or path
      default: "",
    },

    storeBanner: {
      type: String, // URL or path
      default: "",
    },

    /* ================= CONTACT INFO ================= */
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },

    whatsappNumber: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      default: "",
    },

    /* ================= ADDRESS ================= */
    address: {
      street: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      pincode: { type: String, trim: true, default: "" },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },

    /* ================= DELIVERY SETTINGS ================= */
    deliveryCharges: {
      type: Number,
      default: 0,
      min: 0,
    },

    freeDeliveryAbove: {
      type: Number,
      default: 0, // 0 means no free delivery threshold
      min: 0,
    },

    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    deliveryRadius: {
      type: Number, // in km
      default: 5,
      min: 0,
    },

    estimatedDeliveryTime: {
      type: String, // e.g., "30-45 mins"
      trim: true,
      default: "",
    },

    deliverySlots: {
      type: [deliverySlotSchema],
      default: [],
    },

    /* ================= ORDERING CONFIG ================= */
    isOnlineOrderingEnabled: {
      type: Boolean,
      default: true,
    },

    isDeliveryAvailable: {
      type: Boolean,
      default: true,
    },

    isPickupAvailable: {
      type: Boolean,
      default: false,
    },

    acceptedPaymentMethods: {
      type: [String],
      enum: ["COD", "UPI", "ONLINE"],
      default: ["COD"],
    },

    /* ================= UPI / PAYMENT INFO ================= */
    upiId: {
      type: String,
      trim: true,
      default: "",
    },

    /* ================= BUSINESS HOURS ================= */
    businessHours: {
      openTime: { type: String, default: "09:00" },
      closeTime: { type: String, default: "21:00" },
      offDays: { type: [String], default: [] }, // ["Sunday"]
    },

    /* ================= STATUS ================= */
    isProfileComplete: {
      type: Boolean,
      default: false,
    },

    isStoreOnline: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const OnlineProfile = mongoose.model("OnlineProfile", onlineProfileSchema);
export default OnlineProfile;
