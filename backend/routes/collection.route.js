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
import { protectRoute, storeRoute } from "../middleware/auth.middleware.js";
import { cacheHeaders } from "../middleware/cache.middleware.js";

const router = express.Router();

const publicCache = cacheHeaders(60, 300);

// Public collections list
router.get("/", publicCache, getCollections);

// Vendor collections
router.get("/vendor/my-collections", protectRoute, storeRoute, getMyCollections);
router.post("/", protectRoute, storeRoute, validateCreateCollection, createCollection);
router.put("/:id", protectRoute, storeRoute, validateUpdateCollection, updateCollection);
router.delete("/:id", protectRoute, storeRoute, deleteCollection);

// Collection detail
router.get("/:id", validateCollectionIdParam, getCollectionById);

// Collection cart actions
router.post("/cart", protectRoute, addCollectionToCart);
router.put("/cart/:collectionId", protectRoute, updateCollectionCart);
router.delete("/cart/:collectionId", protectRoute, removeCollectionFromCart);

export default router;
