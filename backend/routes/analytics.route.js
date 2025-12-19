import express from "express";
import {
  getSalesOverview,
  getTopProducts,
  getRecentTransactions,
  getPerformanceMetrics,
  getRevenueBreakdown,
  getSalesTrend,
} from "../controllers/analytics.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { translateResponse } from "../middleware/translation.middleware.js";

const router = express.Router();

// All analytics routes require authentication
router.use(protectRoute);

// Get sales overview data
router.get("/sales-overview", translateResponse, getSalesOverview);

// Get top products
router.get("/top-products", translateResponse, getTopProducts);

// Get recent transactions
router.get("/recent-transactions", translateResponse, getRecentTransactions);

// Get performance metrics
router.get("/performance-metrics", translateResponse, getPerformanceMetrics);

// Get revenue breakdown
router.get("/revenue-breakdown", translateResponse, getRevenueBreakdown);

// Get sales trend data
router.get("/sales-trend", translateResponse, getSalesTrend);

export default router;
