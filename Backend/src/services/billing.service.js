import Bill from "../models/Bill.js";
import Product from "../models/Product.js";
import { encrypt } from "../utils/encrypt.js";

/* =========================================================
   BILLING SERVICE
   - Extracted reusable billing logic
   - Used by both existing createBill controller and
     the new order-to-bill conversion
   - Handles: encryption, daily bill number, stock deduction
========================================================= */

/* --------------------------------------------------
   ENCRYPTED FIELDS
-------------------------------------------------- */
const ENCRYPTED_FIELDS = ["items", "subTotal", "discount", "taxPercentage", "totalAmount", "paidAmount"];

/** Encrypts sensitive fields on a plain object before saving to MongoDB. */
export function encryptBill(data) {
  const out = { ...data };
  for (const field of ENCRYPTED_FIELDS) {
    if (out[field] !== undefined) out[field] = encrypt(out[field]);
  }
  return out;
}

/* --------------------------------------------------
   TIMEZONE CONSTANT (IST = UTC +5:30)
-------------------------------------------------- */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/* --------------------------------------------------
   IST TODAY RANGE
-------------------------------------------------- */
function getISTTodayRange() {
  const now = new Date();
  const istTime = new Date(now.getTime() + IST_OFFSET_MS);

  const year = istTime.getUTCFullYear();
  const month = istTime.getUTCMonth();
  const day = istTime.getUTCDate();

  const istMidnight = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const start = new Date(istMidnight.getTime() - IST_OFFSET_MS);

  const istEndOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  const end = new Date(istEndOfDay.getTime() - IST_OFFSET_MS);

  return { start, end };
}

/* --------------------------------------------------
   DAILY BILL NUMBER
-------------------------------------------------- */
export async function generateDailyBillNumber(shopId) {
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
   CREATE BILL FROM ORDER
   - Takes validated order items and creates a bill
   - Deducts inventory
   - Returns the created bill document
-------------------------------------------------- */
export async function createBillFromOrder({
  shopId,
  orderItems,
  totalAmount,
  paymentMode = "NONE",
  paidAmount = 0,
  discount = 0,
  taxPercentage = 0,
}) {
  /* ---------- BUILD BILL ITEMS ---------- */
  const billItems = [];
  let subTotal = 0;

  for (const item of orderItems) {
    const product = await Product.findOne({
      _id: item.product,
      shopId,
      isActive: true,
    }).select("name unit price isTrackable quantity");

    if (!product) {
      throw new Error(`Product not found: ${item.product}`);
    }

    const price = Number(product.price.sellingPrice);
    const quantity = Number(item.quantity);
    const total = price * quantity;
    subTotal += total;

    billItems.push({
      productId: product._id,
      variantId: null,
      name: product.name,
      quantity,
      unit: product.unit || "unit",
      price,
      total,
    });
  }

  /* ---------- CALCULATE FINAL AMOUNTS ---------- */
  const taxAmount = (subTotal * taxPercentage) / 100;
  const finalTotal = Math.max(subTotal + taxAmount - discount, 0);

  /* ---------- PAYMENT STATUS ---------- */
  let paymentStatus = "PAID";
  if (paidAmount === 0) paymentStatus = "UNPAID";
  else if (paidAmount < finalTotal) paymentStatus = "PARTIAL";

  /* ---------- DAILY BILL NUMBER ---------- */
  const dailyBillNumber = await generateDailyBillNumber(shopId);

  /* ---------- CREATE BILL (encrypted) ---------- */
  const bill = await Bill.create(
    encryptBill({
      shopId,
      dailyBillNumber,
      customerId: null,
      items: billItems,
      subTotal,
      discount,
      taxPercentage,
      totalAmount: finalTotal,
      paidAmount,
      paymentStatus,
      paymentMode,
    })
  );

  /* ---------- STOCK DEDUCTION ---------- */
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
        variant.quantity = Math.max(variant.quantity - item.quantity, 0);
      }
    } else {
      product.quantity = Math.max(product.quantity - item.quantity, 0);
    }

    await product.save();
  }

  return bill;
}
