import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createProduct,
  bulkCreateProducts,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductByBarcode,
} from "../controllers/product.controller.js";

const router = express.Router();

// CREATE PRODUCT
router.post("/", protectRoute, createProduct);

// BULK CREATE PRODUCTS
router.post("/bulk", protectRoute, bulkCreateProducts);

// GET ALL PRODUCTS
router.get("/", protectRoute, getProducts);

// GET PRODUCT BY BARCODE (SCAN FLOW)
router.get("/barcode/:barcode", protectRoute, getProductByBarcode);

// GET SINGLE PRODUCT
router.get("/:productId", protectRoute, getProductById);

// UPDATE PRODUCT
router.put("/:productId", protectRoute, updateProduct);

// DELETE PRODUCT (SOFT)
router.delete("/:productId", protectRoute, deleteProduct);

export default router;
