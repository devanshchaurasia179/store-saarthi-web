import mongoose from "mongoose";

/* =========================================================
   ORDER MODEL
   - Created when an online customer places an order via QR
   - Linked to Shop, OnlineCustomer, and optionally Bill
========================================================= */

const ORDER_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "packing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderAddressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    fullAddress: { type: String, required: true },
    houseNumber: { type: String, default: "" },
    landmark: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OnlineCustomer",
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (arr) => arr.length > 0,
        message: "Order must have at least one item",
      },
    },

    address: {
      type: orderAddressSchema,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "UPI", "ONLINE"],
      default: "COD",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
      index: true,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
      default: null,
    },

    acceptedBy: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

/* Compound index for shop + status queries */
orderSchema.index({ shop: 1, status: 1 });
orderSchema.index({ customer: 1, createdAt: -1 });

export { ORDER_STATUSES };
const Order = mongoose.model("Order", orderSchema);
export default Order;
