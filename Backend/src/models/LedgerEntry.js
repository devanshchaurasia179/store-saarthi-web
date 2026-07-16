import mongoose from "mongoose";

const ledgerEntrySchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["DEBIT", "CREDIT"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
      default: null,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// Important compound index for fast ledger queries
ledgerEntrySchema.index({ shopId: 1, customerId: 1, createdAt: -1 });

const LedgerEntry = mongoose.model("LedgerEntry", ledgerEntrySchema);
export default LedgerEntry;
