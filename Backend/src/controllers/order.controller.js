import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Shop from "../models/Shop.js";
import { validateCreateOrder } from "../validators/order.validator.js";

/* =========================================================
   ORDER CONTROLLER (CUSTOMER-FACING)
   - Place orders, view history, cancel pending orders
   - Prices are always calculated server-side
   - Inventory is NOT reduced here (only on bill creation)
========================================================= */

/* --------------------------------------------------
   CREATE ORDER
   POST /api/orders
   Auth: Customer JWT
   Body: { shop, items, address, paymentMethod, notes }
-------------------------------------------------- */
export async function createOrder(req, res) {
  try {
    const customerId = req.customer._id;
    const { shop, items, address, paymentMethod, notes } = req.body;

    /* ---------- VALIDATION ---------- */
    const errors = validateCreateOrder(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors[0] });
    }

    /* ---------- VERIFY SHOP EXISTS ---------- */
    const shopExists = await Shop.findById(shop);
    if (!shopExists) {
      return res.status(404).json({ message: "Shop not found" });
    }

    /* ---------- VALIDATE PRODUCTS & CALCULATE PRICES ---------- */
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.product,
        shopId: shop,
        isActive: true,
      }).select("name price quantity isTrackable");

      if (!product) {
        return res.status(404).json({
          message: `Product not found: ${item.product}`,
        });
      }

      // Check stock (only for trackable products)
      if (product.isTrackable && product.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Available: ${product.quantity}`,
        });
      }

      // Server-side price calculation (never trust frontend)
      const price = Number(product.price.sellingPrice);
      const quantity = Number(item.quantity);
      const subtotal = price * quantity;

      orderItems.push({
        product: product._id,
        productName: product.name,
        price,
        quantity,
        subtotal,
      });

      totalAmount += subtotal;
    }

    /* ---------- CREATE ORDER ---------- */
    const order = await Order.create({
      shop,
      customer: customerId,
      items: orderItems,
      address: {
        label: address.label || "",
        fullAddress: address.fullAddress,
        houseNumber: address.houseNumber || "",
        landmark: address.landmark || "",
        city: address.city || "",
        state: address.state || "",
        pincode: address.pincode || "",
        latitude: address.latitude ?? null,
        longitude: address.longitude ?? null,
      },
      paymentMethod: paymentMethod || "COD",
      notes: notes || "",
      status: "pending",
      totalAmount,
    });

    // Populate shop info for response
    const populatedOrder = await Order.findById(order._id)
      .populate("shop", "shopName address")
      .lean();

    res.status(201).json({
      success: true,
      order: populatedOrder,
    });
  } catch (error) {
    console.error("Create Order Error:", error.message);
    return res.status(500).json({ message: "Failed to create order" });
  }
}

/* --------------------------------------------------
   GET ORDER BY ID
   GET /api/orders/:id
   Auth: Customer JWT
-------------------------------------------------- */
export async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const customerId = req.customer._id;

    const order = await Order.findOne({
      _id: id,
      customer: customerId,
    })
      .populate("shop", "shopName address ownerName")
      .populate("bill")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get Order By Id Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch order" });
  }
}

/* --------------------------------------------------
   GET CUSTOMER ORDER HISTORY
   GET /api/orders
   Auth: Customer JWT
   Query: ?page=1&limit=10&status=pending
-------------------------------------------------- */
export async function getCustomerOrders(req, res) {
  try {
    const customerId = req.customer._id;
    const { page = 1, limit = 10, status = "" } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = { customer: customerId };

    if (status.trim()) {
      filter.status = status.trim();
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("shop", "shopName address")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get Customer Orders Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
}

/* --------------------------------------------------
   CANCEL ORDER
   PATCH /api/orders/:id/cancel
   Auth: Customer JWT
   Only pending orders can be cancelled
-------------------------------------------------- */
export async function cancelOrder(req, res) {
  try {
    const { id } = req.params;
    const customerId = req.customer._id;

    const order = await Order.findOne({
      _id: id,
      customer: customerId,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        message: `Cannot cancel order with status "${order.status}". Only pending orders can be cancelled.`,
      });
    }

    order.status = "cancelled";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Cancel Order Error:", error.message);
    return res.status(500).json({ message: "Failed to cancel order" });
  }
}
