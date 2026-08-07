import Order from "../models/Order.js";
import Shop from "../models/Shop.js";

/* =========================================================
   PAYMENT CONTROLLER
   - Returns UPI details so the customer app can open a
     native UPI deep-link (upi://pay) without a payment
     gateway in between.
========================================================= */

/* --------------------------------------------------
   GET UPI PAYMENT DETAILS
   GET /api/orders/:id/upi-details
   Auth: Customer JWT
   Returns the shop UPI ID and order amount so the
   customer app can open the native UPI intent.
-------------------------------------------------- */
export async function getUpiDetails(req, res) {
  try {
    const { id } = req.params;
    const customerId = req.customer._id;

    const order = await Order.findOne({ _id: id, customer: customerId }).lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({ message: "Order is already paid" });
    }

    const shop = await Shop.findById(order.shop).select("shopName upiId").lean();

    if (!shop?.upiId) {
      return res.status(400).json({ message: "This shop has not configured a UPI ID" });
    }

    res.status(200).json({
      success: true,
      upiId: shop.upiId,
      payeeName: shop.shopName,
      amount: order.totalAmount,
      orderId: order._id,
    });
  } catch (error) {
    console.error("Get UPI Details Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch UPI details" });
  }
}

/* --------------------------------------------------
   CONFIRM UPI PAYMENT
   POST /api/orders/:id/confirm-upi
   Auth: Customer JWT
   Body: { upiRef } (optional — customer-provided ref)
   Marks the order payment status as "paid".
   The shop owner can manually verify on their end.
-------------------------------------------------- */
export async function confirmUpiPayment(req, res) {
  try {
    const { id } = req.params;
    const customerId = req.customer._id;
    const { upiRef = "" } = req.body;

    const order = await Order.findOne({ _id: id, customer: customerId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({ message: "Order is already marked as paid" });
    }

    order.paymentStatus = "paid";
    if (upiRef) order.upiRef = upiRef;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Payment confirmed. The shop will verify and process your order.",
      order,
    });
  } catch (error) {
    console.error("Confirm UPI Payment Error:", error.message);
    return res.status(500).json({ message: "Failed to confirm payment" });
  }
}
