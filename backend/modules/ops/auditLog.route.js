import express from "express";
import { getAuditLogs } from "./auditLog.controller.js";
import { protectRoute, adminRoute } from "../../middleware/auth.middleware.js";

const router = express.Router();

// Audit logs contain account, security and customer activity for ALL users, so
// they are restricted to admins / super-admins (not store owners).
router.use(protectRoute, adminRoute);
router.get("/", getAuditLogs);

export default router;
