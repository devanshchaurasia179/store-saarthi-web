import Product from "../models/Product.js";
import MasterProduct from "../models/MasterProduct.js";

/* -------------------------------
   CONSTANTS
-------------------------------- */
const ALLOWED_UNITS = ["unit", "kg", "g", "litre", "ml", "box", "pack", "dozen"];

/* -------------------------------
   VARIANT VALIDATION HELPER
-------------------------------- */
function validateVariants(variants = []) {
  if (!Array.isArray(variants)) {
    return "Variants must be an array";
  }

  for (const variant of variants) {
    if (!variant.name || typeof variant.name !== "string") {
      return "Each variant must have a valid name";
    }

    if (
      !variant.price ||
      typeof variant.price.sellingPrice !== "number" ||
      variant.price.sellingPrice < 0
    ) {
      return "Each variant must have a valid selling price";
    }

    if (
      variant.barcode &&
      (typeof variant.barcode !== "string" || variant.barcode.trim() === "")
    ) {
      return "Variant barcode must be a non-empty string";
    }

    if (
      variant.quantity !== undefined &&
      (typeof variant.quantity !== "number" || variant.quantity < 0)
    ) {
      return "Variant quantity must be a non-negative number";
    }
  }

  return null;
}

/**
 * BULK CREATE PRODUCTS
 * Accepts: { products: [ { name, barcode, price, ... }, ... ] }
 * Returns a summary of inserted, skipped (duplicate barcodes), and failed items.
 */
export async function bulkCreateProducts(req, res) {
  try {
    const shopId = req.user._id;
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        message: "Request body must contain a non-empty 'products' array",
      });
    }

    const inserted = [];
    const skipped = [];   // duplicate barcodes
    const failed = [];    // validation / other errors

    for (let i = 0; i < products.length; i++) {
      const item = products[i];

      const {
        name,
        barcode,
        category,
        size,
        price,
        quantity,
        expiryDate,
        isBarcodeListed = true,
        isTrackable = true,
        unit = "unit",
        variants = [],
      } = item;

      // --- validation ---
      if (
        !name ||
        !price ||
        typeof price.sellingPrice !== "number" ||
        price.sellingPrice < 0
      ) {
        failed.push({ index: i, barcode, reason: "Name and valid sellingPrice are required" });
        continue;
      }

      if (!barcode || typeof barcode !== "string" || barcode.trim() === "") {
        failed.push({ index: i, reason: "Barcode is required" });
        continue;
      }

      if (!ALLOWED_UNITS.includes(unit)) {
        failed.push({ index: i, barcode, reason: `Invalid unit '${unit}'` });
        continue;
      }

      const variantError = validateVariants(variants);
      if (variantError) {
        failed.push({ index: i, barcode, reason: variantError });
        continue;
      }

      // --- insert ---
      try {
        const product = await Product.create({
          shopId,
          name,
          barcode: barcode.trim(),
          isBarcodeListed: Boolean(isBarcodeListed),
          isTrackable: Boolean(isTrackable),
          category,
          size,
          unit,
          price,
          quantity,
          variants,
          expiryDate,
          isFromMaster: false,
        });
        inserted.push(product);
      } catch (err) {
        if (err.code === 11000) {
          skipped.push({ index: i, barcode: barcode.trim(), reason: "Duplicate barcode" });
        } else {
          failed.push({ index: i, barcode, reason: err.message });
        }
      }
    }

    return res.status(207).json({
      success: true,
      summary: {
        total: products.length,
        inserted: inserted.length,
        skipped: skipped.length,
        failed: failed.length,
      },
      inserted,
      skipped,
      failed,
    });
  } catch (error) {
    console.error("Bulk Create Products Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * CREATE PRODUCT (MANUAL / QUICK ADD)
 */
export async function createProduct(req, res) {
  try {
    const shopId = req.user._id;

    let {
      name,
      barcode,
      category,
      size,
      price,
      quantity,
      expiryDate,
      isBarcodeListed = true,
      isTrackable = true,
      unit = "unit",
      variants = [],
    } = req.body;

    // 🔴 REQUIRED FIELDS
    if (
      !name ||
      !price ||
      typeof price.sellingPrice !== "number" ||
      price.sellingPrice < 0
    ) {
      return res.status(400).json({
        message: "Product name and selling price are required",
      });
    }

    // 🔴 BARCODE REQUIRED
    if (!barcode || typeof barcode !== "string" || barcode.trim() === "") {
      return res.status(400).json({
        message: "Barcode is required",
      });
    }

    // 🔒 UNIT VALIDATION
    if (!ALLOWED_UNITS.includes(unit)) {
      return res.status(400).json({
        message: "Invalid unit",
      });
    }

    // 🔒 VARIANT VALIDATION
    const variantError = validateVariants(variants);
    if (variantError) {
      return res.status(400).json({
        message: variantError,
      });
    }

    const product = await Product.create({
      shopId,
      name,
      barcode: barcode.trim(),
      isBarcodeListed: Boolean(isBarcodeListed),
      isTrackable: Boolean(isTrackable), // ✅ FIXED
      category,
      size,
      unit,
      price,
      quantity,
      variants,
      expiryDate,
      isFromMaster: false,
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error("Create Product Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Product with this barcode already exists",
      });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * GET ALL PRODUCTS
 */
export async function getProducts(req, res) {
  try {
    const shopId = req.user._id;

    const products = await Product.find({
      shopId,
      isActive: true,
    }).sort({ updatedAt: -1 });

    res.status(200).json({ success: true, products });
  } catch (error) {
    console.error("Get Products Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * 🔥 GET PRODUCT BY BARCODE (SMART SCAN)
 * Supports PRODUCT + VARIANT barcodes
 */
export async function getProductByBarcode(req, res) {
  try {
    const shopId = req.user._id;
    const { barcode } = req.params;

    if (!barcode) {
      return res.status(400).json({
        message: "Barcode is required",
      });
    }

    // 1️⃣ Check MAIN PRODUCT barcode (NO isBarcodeListed filter)
    let product = await Product.findOne({
      shopId,
      barcode,
      isActive: true,
    });

    if (product) {
      return res.status(200).json({
        success: true,
        product,
        variant: null,
        source: "SHOP",
      });
    }

    // 2️⃣ Check VARIANT barcode
    product = await Product.findOne({
      shopId,
      "variants.barcode": barcode,
      isActive: true,
    });

    if (product) {
      const variant = product.variants.find(
        (v) => v.barcode === barcode
      );

      return res.status(200).json({
        success: true,
        product,
        variant,
        source: "SHOP_VARIANT",
      });
    }

    // 3️⃣ Check master catalog
    const masterProduct = await MasterProduct.findOne({ barcode });

    if (!masterProduct) {
      return res.status(404).json({
        message: "Product not found",
        source: "NONE",
      });
    }

    // 4️⃣ Auto-create shop product from master
    product = await Product.create({
      shopId,
      name: masterProduct.name,
      barcode: masterProduct.barcode,
      isBarcodeListed: true,
      isTrackable: true, // ✅ FIXED
      category: masterProduct.category,
      size: masterProduct.size,
      unit: masterProduct.unit || "unit",
      price: {
        sellingPrice: masterProduct.mrp,
        mrp: masterProduct.mrp,
      },
      quantity: 0,
      variants: [],
      expiryDate: null,
      isFromMaster: true,
    });

    return res.status(200).json({
      success: true,
      product,
      variant: null,
      source: "MASTER",
    });
  } catch (error) {
    console.error("Barcode Lookup Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * GET PRODUCT BY ID
 */
export async function getProductById(req, res) {
  try {
    const shopId = req.user._id;
    const { productId } = req.params;

    const product = await Product.findOne({
      _id: productId,
      shopId,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error("Get Product Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * UPDATE PRODUCT
 */
export async function updateProduct(req, res) {
  try {
    const shopId = req.user._id;
    const { productId } = req.params;

    const updateData = { ...req.body };

    // 🔒 BARCODE VALIDATION
    if ("barcode" in updateData) {
      if (
        typeof updateData.barcode !== "string" ||
        updateData.barcode.trim() === ""
      ) {
        return res.status(400).json({
          message: "Barcode is required and cannot be removed",
        });
      }
      updateData.barcode = updateData.barcode.trim();
    }

    // 🔒 UNIT VALIDATION
    if ("unit" in updateData) {
      if (!ALLOWED_UNITS.includes(updateData.unit)) {
        return res.status(400).json({
          message: "Invalid unit",
        });
      }
    }

    // 🔒 VARIANT VALIDATION
    if ("variants" in updateData) {
      const variantError = validateVariants(updateData.variants);
      if (variantError) {
        return res.status(400).json({
          message: variantError,
        });
      }
    }

    const product = await Product.findOneAndUpdate(
      { _id: productId, shopId },
      updateData,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error("Update Product Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Product with this barcode already exists",
      });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * DELETE PRODUCT (HARD DELETE)
 */
export async function deleteProduct(req, res) {
  try {
    const shopId = req.user._id;
    const { productId } = req.params;

    const product = await Product.findOneAndDelete({
      _id: productId,
      shopId,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      success: true,
      message: "Product permanently deleted",
    });
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
