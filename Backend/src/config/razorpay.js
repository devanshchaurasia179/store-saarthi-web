import Razorpay from "razorpay";
import crypto from "crypto";

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order
 * @param {number} amount - Amount in INR (will be converted to paise)
 * @param {string} receipt - Unique receipt identifier
 * @param {object} notes - Additional metadata
 */
export async function createRazorpayOrder(amount, receipt, notes = {}) {
  const options = {
    amount: Math.round(amount * 100), // Convert to paise
    currency: "INR",
    receipt,
    notes,
  };
  return razorpayInstance.orders.create(options);
}

/**
 * Verify Razorpay payment signature
 * @param {string} razorpayOrderId
 * @param {string} razorpayPaymentId
 * @param {string} razorpaySignature
 * @returns {boolean}
 */
export function verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return expectedSignature === razorpaySignature;
}

export default razorpayInstance;
