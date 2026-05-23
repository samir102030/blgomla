import express from "express";
import {
  getSettings,
  updateSettings,
  listZones,
  listServices,
  createShipment,
  refreshTracking,
} from "../controllers/accurate.controller.js";
import {
  protectRoute,
  adminRoute,
  adminOrStoreRoute,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Config + map building (admin only).
router.get("/settings", protectRoute, adminRoute, getSettings);
router.put("/settings", protectRoute, adminRoute, updateSettings);
router.get("/zones", protectRoute, adminRoute, listZones);
router.get("/services", protectRoute, adminRoute, listServices);

// Shipment operations (staff: admin or store).
router.post(
  "/orders/:id/shipment",
  protectRoute,
  adminOrStoreRoute,
  createShipment
);
router.get(
  "/orders/:id/tracking",
  protectRoute,
  adminOrStoreRoute,
  refreshTracking
);

export default router;
