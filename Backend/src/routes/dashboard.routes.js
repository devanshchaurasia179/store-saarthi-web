import express from "express";
import { getDashboard } from "../controllers/dashboard.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();
router.get("/", protectRoute, getDashboard);
export default router;
