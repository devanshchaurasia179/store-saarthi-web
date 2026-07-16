import mongoose from "mongoose";

/* ---------------- VARIANT SCHEMA ---------------- */

const variantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true, // e.g. "500ml", "Large", "Red"
    },

    barcode: {
      type: String,
      default: null,
      index: true, // optional barcode per variant
    },

    price: {
      sellingPrice: {
        type: Number,
        required: true,
        min: 0,
      },
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
);

/* ---------------- PRODUCT SCHEMA ---------------- */

const productSchema = new mongoose.Schema(
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

    barcode: {
      type: String,
      index: true,
      required: true,
    },

    isBarcodeListed: {
      type: Boolean,
      default: false,
      index: true,
    },

    category: {
      type: String,
      default: "Other",
      trim: true,
    },

    unit: {
      type: String,
      enum: ["unit", "kg", "g", "litre", "ml", "box", "pack", "dozen"],
      default: "unit",
      index: true,
    },

    price: {
      sellingPrice: {
        type: Number,
        required: true,
        min: 0,
      },
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** 🆕 VARIANTS */
    variants: {
      type: [variantSchema],
      default: [],
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    isTrackable: {
      type: Boolean,
      default: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/* Prevent duplicate main barcode per shop */
productSchema.index(
  { shopId: 1, barcode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      barcode: { $type: "string" },
    },
  }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
