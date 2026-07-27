import Order from "../models/Order.js";
import { createRazorpayOrder, verifyPaymentSignature } from "../config/razorpay.js";

/* =========================================================
   PAYMENT CONTROLLER
   - Create Razorpay order for an existing order
   - Verify payment after Razorpay Checkout completes
========================================================= */

/* --------------------------------------------------
   CREATE RAZORPAY ORDER
   POST /api/orders/:id/pay
   Auth: Customer JWT
   Creates a Razorpay order and links it to the app order
-------------------------------------------------- */
export async function createPaymentOrder(req, res) {
  try {
    const { id } = req.params;
    const customerId = req.customer._id;

    const order = await Order.findOne({ _id: id, customer: customerId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({ message: "Order is already paid" });
    }

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder(
      order.totalAmount,
      `order_${order._id}`,
      { orderId: String(order._id), shop: String(order.shop) }
    );

    // Save Razorpay order ID to our order
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.status(200).json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create Payment Order Error:", error.message);
    return res.status(500).json({ message: "Failed to create payment order" });
  }
}

/* --------------------------------------------------
   VERIFY PAYMENT
   POST /api/orders/:id/verify-payment
   Auth: Customer JWT
   Body: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
-------------------------------------------------- */
export async function verifyPayment(req, res) {
  try {
    const { id } = req.params;
    const customerId = req.customer._id;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification fields" });
    }

    const order = await Order.findOne({ _id: id, customer: customerId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Verify that the razorpay_order_id matches what we stored
    if (order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ message: "Order ID mismatch" });
    }

    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      order.paymentStatus = "failed";
      await order.save();
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // Mark payment as successful
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.paymentStatus = "paid";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      order,
    });
  } catch (error) {
    console.error("Verify Payment Error:", error.message);
    return res.status(500).json({ message: "Failed to verify payment" });
  }
}
