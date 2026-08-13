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

const router = express.Router();

const publicCache = cacheHeaders(60, 300);

// Public collections list
router.get("/", publicCache, translateResponse, getCollections);

// Management (raw — both languages, since vendors edit them side by side).
// These were gated on `storeRoute`, i.e. role === "store" exactly, which shut
// admins out of the collections page entirely. A permission check lets both
// through; the controllers keep vendors scoped to their own store.
router.get("/vendor/my-collections", protectRoute, requirePermission("collections.manage"), getMyCollections);
router.post("/", protectRoute, requirePermission("collections.manage"), validateCreateCollection, createCollection);
router.put("/:id", protectRoute, requirePermission("collections.manage"), validateUpdateCollection, updateCollection);
router.delete("/:id", protectRoute, requirePermission("collections.manage"), deleteCollection);

// Collection detail (public)
router.get("/:id", translateResponse, validateCollectionIdParam, getCollectionById);

// Collection cart actions
router.post("/cart", protectRoute, addCollectionToCart);
router.put("/cart/:collectionId", protectRoute, updateCollectionCart);
router.delete("/cart/:collectionId", protectRoute, removeCollectionFromCart);

export default router;
