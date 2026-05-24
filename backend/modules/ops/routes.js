import express from "express";
import analyticsRoutes from "./analytics.route.js";
import auditLogRoutes from "./auditLog.route.js";
import siteModeRoutes from "./siteMode.route.js";
import cronRoutes from "./cron.route.js";

// Aggregates every HTTP surface owned by the `ops` module behind one router.
// Mounted at the API root by system.route.js; sub-paths preserve the original
// public URLs so nothing client-facing changes.
const router = express.Router();

router.use("/analytics", analyticsRoutes);
router.use("/audit-logs", auditLogRoutes);
router.use("/site-mode", siteModeRoutes);
router.use("/cron", cronRoutes);

export default router;
