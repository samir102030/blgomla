import express from "express";
import { getAuditLogs } from "./auditLog.controller.js";
import { protectRoute, adminOrStoreRoute } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute, adminOrStoreRoute);
router.get("/", getAuditLogs);

export default router;
