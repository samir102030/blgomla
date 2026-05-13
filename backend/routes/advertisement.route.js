import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
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
router.post("/", protectRoute, adminRoute, createAdvertisement);
router.get("/", protectRoute, adminRoute, getAllAdvertisements);
router.get("/:advertisementId", protectRoute, adminRoute, getAdvertisementById);
router.put("/:advertisementId", protectRoute, adminRoute, updateAdvertisement);
router.delete("/:advertisementId", protectRoute, adminRoute, deleteAdvertisement);

export default router;

