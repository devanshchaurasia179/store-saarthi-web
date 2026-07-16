import mongoose from "mongoose";

const masterProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    barcode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    category: {
      type: String,
      default: "General",
    },

    size: {
      type: String,
      default: "",
    },

    mrp: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const MasterProduct = mongoose.model("MasterProduct", masterProductSchema);
export default MasterProduct;
