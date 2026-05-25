import express from "express";
import {
  getPublicSiteMode,
  getAdminSiteMode,
  updateSiteMode,
  subscribeComingSoon,
  listSubscribers,
} from "./siteMode.controller.js";
import { protectRoute, requirePermission } from "../../middleware/auth.middleware.js";

const router = express.Router();

// Public
router.get("/", getPublicSiteMode);
router.post("/subscribe", subscribeComingSoon);

// Admin
router.get("/admin", protectRoute, requirePermission("siteMode.view"), getAdminSiteMode);
router.put("/admin", protectRoute, requirePermission("siteMode.manage"), updateSiteMode);
router.get("/admin/subscribers", protectRoute, requirePermission("siteMode.view"), listSubscribers);

export default router;
