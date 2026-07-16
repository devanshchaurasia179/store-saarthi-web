import Bill from "../models/Bill.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import LedgerEntry from "../models/LedgerEntry.js";
import { encrypt, decrypt } from "../utils/encrypt.js";

/* --------------------------------------------------
   ENCRYPTED FIELDS
-------------------------------------------------- */
const ENCRYPTED_FIELDS = ["items", "subTotal", "discount", "taxPercentage", "totalAmount", "paidAmount"];

/** Encrypts sensitive fields on a plain object before saving to MongoDB. */
function encryptBill(data) {
  const out = { ...data };
  for (const field of ENCRYPTED_FIELDS) {
    if (out[field] !== undefined) out[field] = encrypt(out[field]);
  }
  return out;
}

/** Decrypts sensitive fields on a Mongoose doc or plain object returned from MongoDB. */
function decryptBill(doc) {
  if (!doc) return doc;
  // Support both Mongoose documents (toObject) and plain lean objects
  const obj = typeof doc.toObject === "function" ? doc.toObject({ virtuals: true }) : { ...doc };
  for (const field of ENCRYPTED_FIELDS) {
    if (obj[field] === undefined || obj[field] === null) continue;
    const val = obj[field];
    // If it's already a non-string (number, array, object) — legacy unencrypted bill
    // decrypt() handles this: it returns non-strings as-is.
    obj[field] = decrypt(val);
  }
  return obj;
}

/* --------------------------------------------------
   TIMEZONE CONSTANT (IST = UTC +5:30)
-------------------------------------------------- */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 19800000 ms

/* --------------------------------------------------
   IST TODAY RANGE - CORRECT & RELIABLE
-------------------------------------------------- */
function getISTTodayRange() {
  const now = new Date();

  // Shift to IST time to get correct "today" in shop timezone
  const istTime = new Date(now.getTime() + IST_OFFSET_MS);

  // Extract date parts from IST perspective
  const year = istTime.getUTCFullYear();
  const month = istTime.getUTCMonth();
  const day = istTime.getUTCDate();

  // Midnight 00:00:00 IST expressed as UTC timestamp
  const istMidnight = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const start = new Date(istMidnight.getTime() - IST_OFFSET_MS);

  // 23:59:59.999 IST expressed as UTC timestamp
  const istEndOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  const end = new Date(istEndOfDay.getTime() - IST_OFFSET_MS);

  return { start, end };
}

/* --------------------------------------------------
   DAILY BILL NUMBER (NOW FULLY IST-CORRECT)
-------------------------------------------------- */
async function generateDailyBillNumber(shopId) {
  const { start, end } = getISTTodayRange();

  const lastBill = await Bill.findOne({
    shopId,
    createdAt: { $gte: start, $lte: end },
  })
    .sort({ dailyBillNumber: -1 })
    .select("dailyBillNumber");

  return lastBill ? lastBill.dailyBillNumber + 1 : 1;
}

/* --------------------------------------------------
   CREATE BILL
   POST /api/bills
-------------------------------------------------- */
export async function createBill(req, res) {
  try {
    const shopId = req.user._id;

    const {
      items = [],
      discount = 0,
      taxPercentage = 0,
      customerId = null,
      paidAmount = 0,
      paymentMode = "NONE",
    } = req.body;

    /* -----------------------------
       1️⃣ VALIDATION
    ----------------------------- */
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Bill items are required" });
    }

    if (paidAmount < 0 || discount < 0 || taxPercentage < 0) {
      return res.status(400).json({ message: "Invalid payment values" });
    }

    /* -----------------------------
       2️⃣ CALCULATE TOTALS (VARIANT AWARE)
    ----------------------------- */
    let subTotal = 0;
    const billItems = [];

    for (const item of items) {
      const quantity = Number(item.quantity);

      if (!item.productId || quantity <= 0) {
        return res.status(400).json({
          message: "Invalid bill item data",
        });
      }

      const product = await Product.findOne({
        _id: item.productId,
        shopId,
        isActive: true,
      }).select("name unit isTrackable quantity variants price");

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

let variant = null;
let variantId = null; // ✅ ADD THIS

if (item.variantId) {
  variant = product.variants.id(item.variantId);
  if (!variant) {
    return res.status(400).json({
      message: "Invalid variant selected",
    });
  }
  variantId = variant._id; // ✅ ADD THIS
}


      const unit =
        item.unit &&
        ["unit", "kg", "g", "litre", "ml", "box", "pack", "dozen"].includes(item.unit)
          ? item.unit
          : product.unit || "unit";

      const price = variant
  ? Number(variant.price.sellingPrice)
  : Number(product.price.sellingPrice);


      if (price < 0) {
        return res.status(400).json({
          message: "Invalid price value",
        });
      }

      const total = quantity * price;
      subTotal += total;

      billItems.push({
        productId: product._id,
        variantId,
        name: variant
          ? `${product.name} (${variant.name})`
          : product.name,
        quantity,
        unit,
        price,
        total,
      });
    }

    const taxAmount = (subTotal * taxPercentage) / 100;
    const totalAmount = Math.max(subTotal + taxAmount - discount, 0);

    /* -----------------------------
       3️⃣ PAYMENT STATUS
    ----------------------------- */
    let paymentStatus = "PAID";
    if (paidAmount === 0) paymentStatus = "UNPAID";
    else if (paidAmount < totalAmount) paymentStatus = "PARTIAL";

    /* -----------------------------
       5️⃣ CREATE BILL (encrypted)
    ----------------------------- */
    const dailyBillNumber = await generateDailyBillNumber(shopId);

    const bill = await Bill.create(encryptBill({
      shopId,
      dailyBillNumber,
      customerId,
      items: billItems,
      subTotal,
      discount,
      taxPercentage,
      totalAmount,
      paidAmount,
      paymentStatus,
      paymentMode,
    }));

    /* -----------------------------
       6️⃣ STOCK ADJUSTMENT (VARIANT SAFE)
    ----------------------------- */
    for (const item of billItems) {
      const product = await Product.findOne({
        _id: item.productId,
        shopId,
        isActive: true,
      });

      if (!product) continue;
      if (product.isTrackable === false) continue;

      if (item.variantId) {
        const variant = product.variants.id(item.variantId);
        if (variant) {
          variant.quantity = Math.max(
            variant.quantity - item.quantity,
            0
          );
        }
      } else {
        product.quantity = Math.max(
          product.quantity - item.quantity,
          0
        );
      }

      await product.save();
    }

    /* -----------------------------
       7️⃣ LEDGER + CUSTOMER BALANCE
    ----------------------------- */
    if (customerId) {
      const difference = totalAmount - paidAmount;

      if (difference > 0) {
        await LedgerEntry.create({
          shopId,
          customerId,
          type: "DEBIT",
          amount: difference,
          billId: bill._id,
          note: "Bill due",
        });

        await Customer.findByIdAndUpdate(customerId, {
          $inc: { totalPending: difference },
        });
      }

      if (difference < 0) {
        const advance = Math.abs(difference);

        await LedgerEntry.create({
          shopId,
          customerId,
          type: "CREDIT",
          amount: advance,
          billId: bill._id,
          note: "Advance payment",
        });

        await Customer.findByIdAndUpdate(customerId, {
          $inc: { totalPending: -advance },
        });
      }
    }
    return res.status(201).json({
      success: true,
      bill: decryptBill(bill),
    });
  } catch (error) {
    console.error("Create Bill Error:", error.message);
    return res.status(500).json({
      message: "Failed to create bill",
    });
  }
}

/* --------------------------------------------------
   GET ALL BILLS
-------------------------------------------------- */
export async function getBills(req, res) {
  try {
    const shopId = req.user._id;

    const rawBills = await Bill.find({ shopId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      bills: rawBills.map(decryptBill),
    });
  } catch (error) {
    console.error("Get Bills Error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch bills",
    });
  }
}

/* --------------------------------------------------
   GET BILL BY ID
-------------------------------------------------- */
export async function getBillById(req, res) {
  try {
    const shopId = req.user._id;
    const { billId } = req.params;

    const bill = await Bill.findOne({
      _id: billId,
      shopId,
    }).populate("customerId", "name mobileNumber");

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    return res.status(200).json({
      success: true,
      bill: decryptBill(bill),
    });
  } catch (error) {
    console.error("Get Bill By Id Error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch bill",
    });
  }
}
