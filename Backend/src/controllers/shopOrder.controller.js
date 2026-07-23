import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { validateStatusTransition, validateUpdateItems } from "../validators/order.validator.js";
import { createBillFromOrder } from "../services/billing.service.js";
import { decrypt } from "../utils/encrypt.js";

/* =========================================================
   SHOP ORDER CONTROLLER (SHOP OWNER-FACING)
   - View, accept, reject, update items, change status
   - Uses existing protectRoute (shop JWT)
========================================================= */

/* --------------------------------------------------
   GET SHOP ORDERS
   GET /api/shop/orders
   Auth: Shop Owner JWT
   Query: ?status=pending&page=1&limit=20
-------------------------------------------------- */
export async function getShopOrders(req, res) {
  try {
    const shopId = req.user._id;
    const { status = "", page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = { shop: shopId };

    if (status.trim()) {
      filter.status = status.trim();
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("customer", "name phone")
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
    console.error("Get Shop Orders Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
}

/* --------------------------------------------------
   GET SHOP ORDER BY ID
   GET /api/shop/orders/:id
   Auth: Shop Owner JWT
-------------------------------------------------- */
export async function getShopOrderById(req, res) {
  try {
    const shopId = req.user._id;
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, shop: shopId })
      .populate("customer", "name phone addresses")
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
    console.error("Get Shop Order By Id Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch order" });
  }
}

/* --------------------------------------------------
   ACCEPT ORDER
   PATCH /api/shop/orders/:id/accept
   Auth: Shop Owner JWT
-------------------------------------------------- */
export async function acceptOrder(req, res) {
  try {
    const shopId = req.user._id;
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, shop: shopId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        message: `Cannot accept order with status "${order.status}". Only pending orders can be accepted.`,
      });
    }

    order.status = "accepted";
    order.acceptedBy = req.user.ownerName || req.user.shopName || "";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order accepted",
      order,
    });
  } catch (error) {
    console.error("Accept Order Error:", error.message);
    return res.status(500).json({ message: "Failed to accept order" });
  }
}

/* --------------------------------------------------
   REJECT ORDER
   PATCH /api/shop/orders/:id/reject
   Auth: Shop Owner JWT
-------------------------------------------------- */
export async function rejectOrder(req, res) {
  try {
    const shopId = req.user._id;
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, shop: shopId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        message: `Cannot reject order with status "${order.status}". Only pending orders can be rejected.`,
      });
    }

    order.status = "rejected";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order rejected",
      order,
    });
  } catch (error) {
    console.error("Reject Order Error:", error.message);
    return res.status(500).json({ message: "Failed to reject order" });
  }
}

/* --------------------------------------------------
   UPDATE ORDER ITEMS (before acceptance or after)
   PATCH /api/shop/orders/:id/update-items
   Auth: Shop Owner JWT
   Body: { items: [{ product, quantity }] }
   
   Owner can:
   - Change quantity of items
   - Remove items (set quantity to 0)
   - Recalculates totals
-------------------------------------------------- */
export async function updateOrderItems(req, res) {
  try {
    const shopId = req.user._id;
    const { id } = req.params;
    const { items } = req.body;

    /* ---------- VALIDATION ---------- */
    const errors = validateUpdateItems(items);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors[0] });
    }

    const order = await Order.findOne({ _id: id, shop: shopId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only allow editing pending or accepted orders
    if (!["pending", "accepted"].includes(order.status)) {
      return res.status(400).json({
        message: `Cannot update items for order with status "${order.status}"`,
      });
    }

    /* ---------- PROCESS ITEM UPDATES ---------- */
    const updatedItems = [];
    let newTotal = 0;

    for (const updateItem of items) {
      const quantity = Number(updateItem.quantity);

      // quantity 0 means remove item
      if (quantity === 0) continue;

      // Verify product exists and belongs to this shop
      const product = await Product.findOne({
        _id: updateItem.product,
        shopId: shopId,
        isActive: true,
      }).select("name price quantity isTrackable");

      if (!product) {
        return res.status(404).json({
          message: `Product not found: ${updateItem.product}`,
        });
      }

      // Check stock
      if (product.isTrackable && product.quantity < quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Available: ${product.quantity}`,
        });
      }

      const price = Number(product.price.sellingPrice);
      const subtotal = price * quantity;

      updatedItems.push({
        product: product._id,
        productName: product.name,
        price,
        quantity,
        subtotal,
      });

      newTotal += subtotal;
    }

    // Must have at least 1 item remaining
    if (updatedItems.length === 0) {
      return res.status(400).json({
        message: "Order must have at least one item. Reject the order instead.",
      });
    }

    order.items = updatedItems;
    order.totalAmount = newTotal;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order items updated",
      order,
    });
  } catch (error) {
    console.error("Update Order Items Error:", error.message);
    return res.status(500).json({ message: "Failed to update order items" });
  }
}

/* --------------------------------------------------
   UPDATE ORDER STATUS
   PATCH /api/shop/orders/:id/status
   Auth: Shop Owner JWT
   Body: { status: "packing" }
-------------------------------------------------- */
export async function updateOrderStatus(req, res) {
  try {
    const shopId = req.user._id;
    const { id } = req.params;
    const { status: newStatus } = req.body;

    if (!newStatus) {
      return res.status(400).json({ message: "status is required" });
    }

    const order = await Order.findOne({ _id: id, shop: shopId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Validate transition
    const transitionError = validateStatusTransition(order.status, newStatus);
    if (transitionError) {
      return res.status(400).json({ message: transitionError });
    }

    order.status = newStatus;
    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to "${newStatus}"`,
      order,
    });
  } catch (error) {
    console.error("Update Order Status Error:", error.message);
    return res.status(500).json({ message: "Failed to update order status" });
  }
}

/* --------------------------------------------------
   CREATE BILL FROM ORDER
   POST /api/shop/orders/:id/create-bill
   Auth: Shop Owner JWT

   Flow:
   1. Validate order exists & belongs to shop
   2. Order must be accepted (not pending/rejected/cancelled)
   3. Order must not already have a bill
   4. Call billing service (creates bill, deducts inventory)
   5. Link bill to order
   6. Mark order as accepted (if pending) or keep current status

   Body (optional): { paymentMode, paidAmount, discount, taxPercentage }
-------------------------------------------------- */
export async function createBillFromOrderEndpoint(req, res) {
  try {
    const shopId = req.user._id;
    const { id } = req.params;
    const {
      paymentMode = "NONE",
      paidAmount = 0,
      discount = 0,
      taxPercentage = 0,
    } = req.body;

    /* ---------- FIND ORDER ---------- */
    const order = await Order.findOne({ _id: id, shop: shopId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    /* ---------- VALIDATE STATE ---------- */
    if (order.bill) {
      return res.status(400).json({
        message: "Bill already generated for this order",
      });
    }

    if (["rejected", "cancelled"].includes(order.status)) {
      return res.status(400).json({
        message: `Cannot create bill for ${order.status} order`,
      });
    }

    /* ---------- VALIDATE STOCK ---------- */
    for (const item of order.items) {
      const product = await Product.findOne({
        _id: item.product,
        shopId,
        isActive: true,
      }).select("name quantity isTrackable");

      if (!product) {
        return res.status(404).json({
          message: `Product not found: ${item.productName}`,
        });
      }

      if (product.isTrackable && product.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Available: ${product.quantity}, Required: ${item.quantity}`,
        });
      }
    }

    /* ---------- CREATE BILL (reuses existing billing logic) ---------- */
    const bill = await createBillFromOrder({
      shopId,
      orderItems: order.items,
      totalAmount: order.totalAmount,
      paymentMode,
      paidAmount: Number(paidAmount),
      discount: Number(discount),
      taxPercentage: Number(taxPercentage),
    });

    /* ---------- LINK BILL TO ORDER & UPDATE STATUS ---------- */
    order.bill = bill._id;

    // Auto-accept if still pending
    if (order.status === "pending") {
      order.status = "accepted";
      order.acceptedBy = req.user.ownerName || req.user.shopName || "";
    }

    await order.save();

    /* ---------- DECRYPT BILL FOR RESPONSE ---------- */
    const ENCRYPTED_FIELDS = ["items", "subTotal", "discount", "taxPercentage", "totalAmount", "paidAmount"];
    const billObj = bill.toObject ? bill.toObject() : { ...bill };
    for (const field of ENCRYPTED_FIELDS) {
      if (billObj[field] !== undefined && billObj[field] !== null) {
        billObj[field] = decrypt(billObj[field]);
      }
    }

    res.status(201).json({
      success: true,
      message: "Bill created successfully. Inventory deducted.",
      order: {
        _id: order._id,
        status: order.status,
        bill: order.bill,
      },
      bill: billObj,
    });
  } catch (error) {
    console.error("Create Bill From Order Error:", error.message);
    return res.status(500).json({ message: "Failed to create bill from order" });
  }
}
