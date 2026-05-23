import express from "express";
import {
  getSalesOverview,
  getTopProducts,
  getRecentTransactions,
  getPerformanceMetrics,
  getRevenueBreakdown,
  getSalesTrend,
} from "../controllers/analytics.controller.js";
import {
  getPaymentAnalytics,
  getInventoryAlerts,
  getCustomerAnalytics,
} from "../controllers/admin.analytics.controller.js";
import { createEvent, getInsights } from "../controllers/event.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { translateResponse } from "../middleware/translation.middleware.js";

const router = express.Router();

// PUBLIC: anonymous behavioral-event capture (must stay above protectRoute).
router.post("/events", createEvent);

// All analytics routes below require authentication
router.use(protectRoute);

// Admin merchandising insights (top searches, zero-results, top-viewed)
router.get("/insights", translateResponse, getInsights);

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

// ── Phase 5: Admin Analytics ──
router.get("/payments", translateResponse, getPaymentAnalytics);
router.get("/inventory-alerts", translateResponse, getInventoryAlerts);
router.get("/customers", translateResponse, getCustomerAnalytics);

// ── Visitor Analytics ──
import {
  getVisitorStats,
  getDeviceBreakdown,
  getLocationBreakdown,
  getTopPages,
} from "../controllers/visitor.controller.js";

router.get("/visitors/stats", getVisitorStats);
router.get("/visitors/devices", getDeviceBreakdown);
router.get("/visitors/locations", getLocationBreakdown);
router.get("/visitors/pages", getTopPages);

export default router;

