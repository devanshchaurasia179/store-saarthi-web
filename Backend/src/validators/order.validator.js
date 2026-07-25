/* =========================================================
   ORDER VALIDATORS
   - Validate request bodies for order-related APIs
========================================================= */

/**
 * Validate create order request body
 */
export function validateCreateOrder(body) {
  const errors = [];

  const { shop, items, address, paymentMethod, orderType, tableNumber } = body;

  // Shop
  if (!shop) {
    errors.push("shop is required");
  }

  // Items
  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push("items must be a non-empty array");
  } else {
    const seenKeys = new Set();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (!item.product) {
        errors.push(`items[${i}].product is required`);
      } else {
        // Build a unique key from product + variant so different variants
        // of the same product are NOT treated as duplicates
        const key = item.variant
          ? `${item.product}::${item.variant}`
          : item.product;

        if (seenKeys.has(key)) {
          errors.push(`Duplicate product in items: ${item.product}`);
        }
        seenKeys.add(key);
      }

      if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        errors.push(`items[${i}].quantity must be a positive integer`);
      }
    }
  }

  // Dine-in: require tableNumber, skip address
  if (orderType === "dineIn") {
    if (!tableNumber || !tableNumber.trim()) {
      errors.push("tableNumber is required for dine-in orders");
    }
  } else {
    // Delivery: require address
    if (!address || !address.fullAddress) {
      errors.push("address.fullAddress is required");
    }

    if (address) {
      if (address.latitude !== undefined && address.latitude !== null) {
        if (typeof address.latitude !== "number" || address.latitude < -90 || address.latitude > 90) {
          errors.push("address.latitude must be between -90 and 90");
        }
      }
      if (address.longitude !== undefined && address.longitude !== null) {
        if (typeof address.longitude !== "number" || address.longitude < -180 || address.longitude > 180) {
          errors.push("address.longitude must be between -180 and 180");
        }
      }
    }
  }

  // Payment method
  const validPaymentMethods = ["COD", "UPI", "ONLINE"];
  if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
    errors.push(`paymentMethod must be one of: ${validPaymentMethods.join(", ")}`);
  }

  return errors;
}

/**
 * Validate status update for orders
 */
export function validateStatusTransition(currentStatus, newStatus) {
  const allowedTransitions = {
    pending: ["accepted", "rejected", "cancelled"],
    accepted: ["packing", "cancelled"],
    packing: ["ready"],
    ready: ["out_for_delivery", "delivered"],
    out_for_delivery: ["delivered"],
  };

  const allowed = allowedTransitions[currentStatus];

  if (!allowed) {
    return `Cannot change status from "${currentStatus}"`;
  }

  if (!allowed.includes(newStatus)) {
    return `Cannot change status from "${currentStatus}" to "${newStatus}". Allowed: ${allowed.join(", ")}`;
  }

  return null;
}

/**
 * Validate update items request (shop owner editing order items)
 */
export function validateUpdateItems(items) {
  const errors = [];

  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push("items must be a non-empty array");
  } else {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (!item.product) {
        errors.push(`items[${i}].product is required`);
      }

      if (item.quantity !== undefined) {
        if (item.quantity < 0 || !Number.isInteger(item.quantity)) {
          errors.push(`items[${i}].quantity must be a non-negative integer`);
        }
      }
    }
  }

  return errors;
}
