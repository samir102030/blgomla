import express from "express";
import {
  addCollectionToCart,
  createCollection,
  deleteCollection,
  getCollectionById,
  getCollections,
  getMyCollections,
  removeCollectionFromCart,
  updateCollection,
  updateCollectionCart,
} from "../controllers/collection.controller.js";
import {
  validateCollectionIdParam,
  validateCreateCollection,
  validateUpdateCollection,
} from "../validations/collection.validate.js";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";
import { cacheHeaders } from "../middleware/cache.middleware.js";
import { translateResponse } from "../middleware/translation.middleware.js";
import { invalidateStorefront } from "../utils/storefrontCache.js";

const router = express.Router();

// maxAge 0: a bundle added, edited or deleted has to be visible on the next
// refresh. It was 60, which is how a freshly created bundle could be missing
// from the listing and a deleted one could still be shown — and clicking that
// stale card 404s.
const publicCache = cacheHeaders(60, 300, 0);

// The home feed carries the bundle rail and is cached under its own
// namespace, so writes here have to clear it or the front page keeps showing
// the bundles as they were.
const invalidate = invalidateStorefront("collections");

// Public collections list
router.get("/", publicCache, translateResponse, getCollections);

// Management (raw — both languages, since vendors edit them side by side).
// These were gated on `storeRoute`, i.e. role === "store" exactly, which shut
// admins out of the collections page entirely. A permission check lets both
// through; the controllers keep vendors scoped to their own store.
router.get("/vendor/my-collections", protectRoute, requirePermission("collections.manage"), getMyCollections);
router.post("/", protectRoute, requirePermission("collections.manage"), invalidate, validateCreateCollection, createCollection);
router.put("/:id", protectRoute, requirePermission("collections.manage"), invalidate, validateUpdateCollection, updateCollection);
router.delete("/:id", protectRoute, requirePermission("collections.manage"), invalidate, deleteCollection);

// Collection detail (public)
router.get("/:id", translateResponse, validateCollectionIdParam, getCollectionById);

// Collection cart actions
router.post("/cart", protectRoute, addCollectionToCart);
router.put("/cart/:collectionId", protectRoute, updateCollectionCart);
router.delete("/cart/:collectionId", protectRoute, removeCollectionFromCart);

export default router;
