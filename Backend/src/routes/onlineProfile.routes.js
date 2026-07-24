import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getOnlineProfile,
  createOnlineProfile,
  updateOnlineProfile,
  toggleStoreOnlineStatus,
} from "../controllers/onlineProfile.controller.js";

const router = express.Router();

/* ================= SHOP ONLINE PROFILE APIs ================= */
// All routes require shop authentication

router.get("/", protectRoute, getOnlineProfile);
router.post("/", protectRoute, createOnlineProfile);
router.put("/", protectRoute, updateOnlineProfile);
router.patch("/toggle-status", protectRoute, toggleStoreOnlineStatus);

export default router;
