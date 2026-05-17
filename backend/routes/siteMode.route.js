import express from "express";
import {
  getPublicSiteMode,
  getAdminSiteMode,
  updateSiteMode,
  subscribeComingSoon,
  listSubscribers,
} from "../controllers/siteMode.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public
router.get("/", getPublicSiteMode);
router.post("/subscribe", subscribeComingSoon);

// Admin
router.get("/admin", protectRoute, adminRoute, getAdminSiteMode);
router.put("/admin", protectRoute, adminRoute, updateSiteMode);
router.get("/admin/subscribers", protectRoute, adminRoute, listSubscribers);

export default router;
