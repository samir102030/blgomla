import express from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";
import { translateResponse } from "../middleware/translation.middleware.js";
import {
  createAdvertisement,
  getAllAdvertisements,
  getActiveAdvertisements,
  getAdvertisementById,
  updateAdvertisement,
  deleteAdvertisement,
  incrementViewCount,
  incrementClickCount,
} from "../controllers/advertisement.controller.js";

const router = express.Router();

// Public routes
router.get("/active", translateResponse, getActiveAdvertisements);
router.post("/:advertisementId/view", incrementViewCount);
router.post("/:advertisementId/click", incrementClickCount);

// Admin routes
router.post("/", protectRoute, requirePermission("advertisements.manage"), createAdvertisement);
router.get("/", protectRoute, requirePermission("advertisements.manage"), getAllAdvertisements);
router.get("/:advertisementId", protectRoute, requirePermission("advertisements.manage"), getAdvertisementById);
router.put("/:advertisementId", protectRoute, requirePermission("advertisements.manage"), updateAdvertisement);
router.delete("/:advertisementId", protectRoute, requirePermission("advertisements.manage"), deleteAdvertisement);

export default router;

