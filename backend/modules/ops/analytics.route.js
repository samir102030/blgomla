import express from "express";
import {
  getSalesOverview,
  getTopProducts,
  getRecentTransactions,
  getPerformanceMetrics,
  getRevenueBreakdown,
  getSalesTrend,
} from "./analytics.controller.js";
import {
  getPaymentAnalytics,
  getInventoryAlerts,
  getCustomerAnalytics,
} from "./admin.analytics.controller.js";
// Cross-module: event capture/insights live in the (future) engagement module.
import { createEvent, getInsights } from "../../controllers/event.controller.js";
import { getBacklog } from "./backlog.controller.js";
import { protectRoute, requirePermission } from "../../middleware/auth.middleware.js";
import { translateResponse } from "../../middleware/translation.middleware.js";

const router = express.Router();

// PUBLIC: anonymous behavioral-event capture (must stay above protectRoute).
router.post("/events", createEvent);

// All analytics routes below require authentication — and a signed-in
// account is not the same as a staff one. Every route here reports on the
// shop as a whole unless the caller is a vendor, which the controllers
// check for by role; a customer, or staff put in charge of one section of
// the catalogue, fell through that check and was handed the platform's
// revenue, its customers and its transactions. `analytics.view` is the
// permission that already says who may read this — vendors and
// administrators hold it, shoppers do not.
router.use(protectRoute);

// Admin merchandising insights (top searches, zero-results, top-viewed)
router.get("/insights", requirePermission("analytics.view"), translateResponse, getInsights);

// Operations backlog — everything awaiting staff action (admin/store only)
router.get("/backlog", requirePermission("analytics.view"), translateResponse, getBacklog);

// Get sales overview data
router.get("/sales-overview", requirePermission("analytics.view"), translateResponse, getSalesOverview);

// Get top products
router.get("/top-products", requirePermission("analytics.view"), translateResponse, getTopProducts);

// Get recent transactions
router.get("/recent-transactions", requirePermission("analytics.view"), translateResponse, getRecentTransactions);

// Get performance metrics
router.get("/performance-metrics", requirePermission("analytics.view"), translateResponse, getPerformanceMetrics);

// Get revenue breakdown
router.get("/revenue-breakdown", requirePermission("analytics.view"), translateResponse, getRevenueBreakdown);

// Get sales trend data
router.get("/sales-trend", requirePermission("analytics.view"), translateResponse, getSalesTrend);

// ── Phase 5: Admin Analytics ──
router.get("/payments", requirePermission("analytics.view"), translateResponse, getPaymentAnalytics);
router.get("/inventory-alerts", requirePermission("analytics.view"), translateResponse, getInventoryAlerts);
router.get("/customers", requirePermission("analytics.view"), translateResponse, getCustomerAnalytics);

// ── Visitor Analytics ──
import {
  getVisitorStats,
  getDeviceBreakdown,
  getLocationBreakdown,
  getTopPages,
} from "../../controllers/visitor.controller.js";

router.get("/visitors/stats", requirePermission("analytics.view"), getVisitorStats);
router.get("/visitors/devices", requirePermission("analytics.view"), getDeviceBreakdown);
router.get("/visitors/locations", requirePermission("analytics.view"), getLocationBreakdown);
router.get("/visitors/pages", requirePermission("analytics.view"), getTopPages);

export default router;

