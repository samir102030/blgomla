import express from "express";
import {
  protectRoute,
  adminRoute,
  adminOrStoreRoute,
} from "../middleware/auth.middleware.js";
import {
  previewPayout,
  listEligibleStores,
  createPayout,
  markPayoutPaid,
  cancelPayout,
  listPayouts,
  getPayout,
  updateMyPayoutDetails,
} from "../controllers/payout.controller.js";

const router = express.Router();

// Admin tooling
router.get("/eligible-stores", protectRoute, adminRoute, listEligibleStores);
router.get("/preview", protectRoute, adminRoute, previewPayout);
router.post("/", protectRoute, adminRoute, createPayout);
router.post("/:id/mark-paid", protectRoute, adminRoute, markPayoutPaid);
router.post("/:id/cancel", protectRoute, adminRoute, cancelPayout);

// Vendor self-service
router.put("/my-details", protectRoute, adminOrStoreRoute, updateMyPayoutDetails);

// Shared list/detail (auto-scoped inside controller)
router.get("/", protectRoute, adminOrStoreRoute, listPayouts);
router.get("/:id", protectRoute, adminOrStoreRoute, getPayout);

export default router;
