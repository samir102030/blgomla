import express from "express";

const router = express.Router();

import {
  protectRoute,
  adminOrStoreRoute,
} from "../middleware/auth.middleware.js";

router.get("/", getAllStores); // Get all stores
router.get("/:storeId", getStoreById); // Get store by ID
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
// update store slider
router.put(
  "/:storeId/slider",
  protectRoute,
  adminOrStoreRoute,
  updateStoreSlider
); // Update store slider
// delete store slider
router.delete(
  "/:storeId/slider",
  protectRoute,
  adminOrStoreRoute,
  deleteStoreSlider
); // Delete store slider
// add new social link
router.post(
  "/:storeId/social-link",
  protectRoute,
  adminOrStoreRoute,
  addSocialLink
); // Add a new social link
// update social link
router.put(
  "/:storeId/social-link/:linkId",
  protectRoute,
  adminOrStoreRoute,
  updateSocialLink
); // Update a social link
// delete social link
router.delete(
  "/:storeId/social-link/:linkId",
  protectRoute,
  adminOrStoreRoute,
  deleteSocialLink
); // Delete a social link

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

// add store feature
router.post(
  "/:storeId/feature",
  protectRoute,
  adminOrStoreRoute,
  addStoreFeature
); // Add a feature to store
// update store feature
router.put(
  "/:storeId/feature/:featureId",
  protectRoute,
  adminOrStoreRoute,
  updateStoreFeature
); // Update a store feature

// delete store feature
router.delete(
  "/:storeId/feature/:featureId",
  protectRoute,
  adminOrStoreRoute,
  deleteStoreFeature
); // Delete a store feature

// add achievement
router.post(
  "/:storeId/achievement",
  protectRoute,
  adminOrStoreRoute,
  addAchievement
); // Add an achievement to store
// update achievement
router.put(
  "/:storeId/achievement/:achievementId",
  protectRoute,
  adminOrStoreRoute,
  updateAchievement
); // Update an achievement
// delete achievement
router.delete(
  "/:storeId/achievement/:achievementId",
  protectRoute,
  adminOrStoreRoute,
  deleteAchievement
); // Delete an achievement

export default router;
