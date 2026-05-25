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
  requirePermission,
  adminOrStoreRoute,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Config + map building (admin only).
router.get("/settings", protectRoute, requirePermission("shipping.manage"), getSettings);
router.put("/settings", protectRoute, requirePermission("shipping.manage"), updateSettings);
router.get("/zones", protectRoute, requirePermission("shipping.manage"), listZones);
router.get("/services", protectRoute, requirePermission("shipping.manage"), listServices);

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
