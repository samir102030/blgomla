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

const router = express.Router();

// All analytics routes require authentication
router.use(protectRoute);

// Get sales overview data
router.get("/sales-overview", getSalesOverview);

// Get top products
router.get("/top-products", getTopProducts);

// Get recent transactions
router.get("/recent-transactions", getRecentTransactions);

// Get performance metrics
router.get("/performance-metrics", getPerformanceMetrics);

// Get revenue breakdown
router.get("/revenue-breakdown", getRevenueBreakdown);

// Get sales trend data
router.get("/sales-trend", getSalesTrend);

export default router;
