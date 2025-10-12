import express from "express";
import multer from "multer";

const router = express.Router();

// Configure multer for document uploads
const storage = multer.memoryStorage();
const documentUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for documents
  },
  fileFilter: (req, file, cb) => {
    // Accept documents and images
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Only PDF, JPG, JPEG, PNG, and GIF files are allowed"),
        false
      );
    }
  },
});

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
  registerVendor,
  approveVendor,
  rejectVendor,
  suspendVendor,
  updateVendorStatus,
  getAllVendors,
  getVendorById,
  deleteVendor,
  getStoreByUserId,
} from "../controllers/store.controller.js";

// Vendor Registration Routes
// Get current user's store (store owner or admin)
router.get("/store", protectRoute, adminOrStoreRoute, getStoreByUserId);

router.get(
  "/:storeId/statistics",
  protectRoute,
  adminOrStoreRoute,
  getStoreStatistics
);

router.get("/statistics", protectRoute, adminOrStoreRoute, getStoreStatistics);
router.post(
  "/register",
  documentUpload.fields([
    { name: "commercialRegistrationDocument", maxCount: 1 },
    { name: "taxCardDocument", maxCount: 1 },
    { name: "nationalIdDocument", maxCount: 1 },
    { name: "bankStatementDocument", maxCount: 1 },
    { name: "storeLogo", maxCount: 1 },
  ]),
  registerVendor
); // Register new vendor
router.get("/vendors", protectRoute, getAllVendors); // Get all vendors (admin only)
router.get("/vendors/:vendorId", protectRoute, getVendorById); // Get vendor by ID
router.put("/vendors/:vendorId/approve", protectRoute, approveVendor); // Approve vendor
router.put("/vendors/:vendorId/reject", protectRoute, rejectVendor); // Reject vendor
router.put("/vendors/:vendorId/suspend", protectRoute, suspendVendor); // Suspend vendor
router.put("/vendors/:vendorId/status", protectRoute, updateVendorStatus); // Update vendor status
router.delete("/vendors/:vendorId", protectRoute, deleteVendor); // Delete vendor

// Store Routes
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
