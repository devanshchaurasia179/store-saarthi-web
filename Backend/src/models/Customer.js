import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobileNumber: {
      type: String,
      trim: true,
      index: true,
    },

    // ✅ NEW FIELD
    isSupplier: {
      type: Boolean,
      default: false, // customer by default
      index: true,
    },

    totalPending: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Prevent duplicate customers per shop (same mobile)
customerSchema.index(
  { shopId: 1, mobileNumber: 1 },
  { unique: true }
);

const Customer = mongoose.model("Customer", customerSchema);
export default Customer;
