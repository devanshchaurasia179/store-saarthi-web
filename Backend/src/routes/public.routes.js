import express from "express";
import {
  getPublicShopInfo,
  getPublicShopProducts,
  getPublicShopCategories,
} from "../controllers/publicShop.controller.js";

const router = express.Router();

/* ================= PUBLIC SHOP APIs ================= */
// No authentication required — used by QR-scanning customers

router.get("/shops/:shopId", getPublicShopInfo);
router.get("/shops/:shopId/products", getPublicShopProducts);
router.get("/shops/:shopId/categories", getPublicShopCategories);

export default router;
