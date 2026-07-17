import express from "express";
import {
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getYearlyAnalytics,
  getAnalyticsReport,
  getAllTimeAnalytics,
} from "../controllers/analytics.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All analytics routes are protected
router.get("/daily", protectRoute, getDailyAnalytics);
router.get("/weekly", protectRoute, getWeeklyAnalytics);
router.get("/monthly", protectRoute, getMonthlyAnalytics);
router.get("/yearly", protectRoute, getYearlyAnalytics);
router.get("/all-time", protectRoute, getAllTimeAnalytics);
router.get("/report", protectRoute, getAnalyticsReport);

export default router;