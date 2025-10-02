import express from "express";

const router = express.Router();

import {
  protectRoute,
  adminOrStoreRoute,
  storeRoute,
} from "../middleware/auth.middleware.js";
import {
  activateStore,
  createStore,
  deactivateStore,
  deleteStore,
  getAllStoreComments,
  getAllStoreOrders,
  getAllStoreProducts,
  getAllStores,
  getStoreById,
  getStoreDashboard,
  getStoreStatistics,
  restoreStore,
  safeDeleteStore,
  updateStore,
} from "../controllers/store.controller.js";

router.get("/", getAllStores); // Get all stores
router.get("/:storeId", getStoreById); // Get store by ID
// todo not implemented yet
router.post("/", protectRoute, adminOrStoreRoute, createStore); // Create a new store
router.put("/:storeId", protectRoute, adminOrStoreRoute, updateStore); // Update store details
router.delete("/:storeId", protectRoute, adminOrStoreRoute, deleteStore); // Delete store
// router.put("/:storeId/restore", protectRoute, adminOrStoreRoute, restoreStore); //
// Restore a deleted store
router.put(
  "/:storeId/safeDelete",
  protectRoute,
  adminOrStoreRoute,
  safeDeleteStore
); // Soft delete store
router.put("/:storeId/restore", protectRoute, adminOrStoreRoute, restoreStore); // Restore soft deleted store

// activate store
router.put(
  "/:storeId/activate",
  protectRoute,
  adminOrStoreRoute,
  activateStore
); // Activate store
// deactivate store
router.put(
  "/:storeId/deactivate",
  protectRoute,
  adminOrStoreRoute,
  deactivateStore
); // Deactivate store

// ============= Store Panel Routes =============

router.get(
  "/:storeId/dashboard",
  protectRoute,
  adminOrStoreRoute,
  getStoreDashboard
);

router.get(
  "/:storeId/statistics",
  protectRoute,
  adminOrStoreRoute,
  getStoreStatistics
);

router.get(
  "/:storeId/products",
  protectRoute,
  adminOrStoreRoute,
  getAllStoreProducts
);

router.get(
  "/:storeId/orders",
  protectRoute,
  adminOrStoreRoute,
  getAllStoreOrders
);

router.get(
  "/:storeId/comments",
  protectRoute,
  adminOrStoreRoute,
  getAllStoreComments
);

export default router;
