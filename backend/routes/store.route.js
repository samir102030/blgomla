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
  adminOrPermission,
} from "../middleware/auth.middleware.js";
import { translateResponse } from "../middleware/translation.middleware.js";
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
  safeDeleteVendor,
  restoreVendor,
  getStoreByUserId,
} from "../controllers/store.controller.js";

// Vendor Registration Routes
// Get current user's store (store owner or admin)
router.get("/store", protectRoute, adminOrStoreRoute, getStoreByUserId);

router.get(
  "/:id/statistics",
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
/*
  The vendor roster and one vendor's record.

  Both sat behind `protectRoute` alone, and `getVendorById` had no check of
  its own — so any signed-in account, a shopper included, could ask for
  `/stores/vendors/<id>` and be handed the store document whole: the four
  files under `documents` (commercial registration, tax card, national ID,
  bank statement), every field of `payoutDetails` (IBAN or account number,
  bank name, InstaPay handle, wallet number), and the owner's name, email and
  phone from the populate. Vendor ids are not secret — they appear in product
  and order payloads — so this was a list anyone with an account could walk.

  These are the same fields kept out of the public store endpoints by
  PUBLIC_STORE_FIELDS. That projection closed the front door; this was the
  side one.
*/
router.get(
  "/vendors",
  protectRoute,
  adminOrPermission("vendors.view"),
  translateResponse,
  getAllVendors
);
router.get(
  "/vendors/:vendorId",
  protectRoute,
  adminOrPermission("vendors.view"),
  translateResponse,
  getVendorById
);
router.put("/vendors/:vendorId/approve", protectRoute, approveVendor); // Approve vendor
router.put("/vendors/:vendorId/reject", protectRoute, rejectVendor); // Reject vendor
router.put("/vendors/:vendorId/suspend", protectRoute, suspendVendor); // Suspend vendor
router.put("/vendors/:vendorId/status", protectRoute, updateVendorStatus); // Update vendor status
router.put("/vendors/:vendorId/safeDelete", protectRoute, safeDeleteVendor); // Soft delete vendor
router.put("/vendors/:vendorId/restore", protectRoute, restoreVendor); // Restore soft deleted vendor

// Store Routes
router.get("/", translateResponse, getAllStores); // Get all stores
router.get("/:id", translateResponse, getStoreById); // Get store by ID
router.put("/:id", protectRoute, adminOrStoreRoute, updateStore); // Update store details
router.delete("/:id", protectRoute, adminOrStoreRoute, deleteStore); // Delete store
// router.put("/:storeId/restore", protectRoute, adminOrStoreRoute, restoreStore); //
// Restore a deleted store
router.put("/:id/safeDelete", protectRoute, adminOrStoreRoute, safeDeleteStore); // Soft delete store
router.put("/:id/restore", protectRoute, adminOrStoreRoute, restoreStore); // Restore soft deleted store

// activate store
router.put("/:id/activate", protectRoute, adminOrStoreRoute, activateStore); // Activate store
// deactivate store
router.put("/:id/deactivate", protectRoute, adminOrStoreRoute, deactivateStore); // Deactivate store

// ============= Store Panel Routes =============

router.get(
  "/:id/dashboard",
  protectRoute,
  adminOrStoreRoute,
  translateResponse,
  getStoreDashboard
);

router.get(
  "/:id/products",
  protectRoute,
  adminOrStoreRoute,
  translateResponse,
  getAllStoreProducts
);

router.get(
  "/:id/orders",
  protectRoute,
  adminOrStoreRoute,
  translateResponse,
  getAllStoreOrders
);

router.get(
  "/:id/comments",
  protectRoute,
  adminOrStoreRoute,
  translateResponse,
  getAllStoreComments
);

export default router;
