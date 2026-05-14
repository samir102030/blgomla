import express from "express";
import {
  protectRoute,
  adminRoute,
  adminOrStoreRoute,
} from "../middleware/auth.middleware.js";
import {
  setBrandToProduct,
  createBrand,
  updateBrand,
  deleteBrand,
  safeDeleteBrand,
  restoreBrand,
  getAllBrands,
  getBrandById,
  getBrandBySlug,
  getBrandsByCategory,
} from "../controllers/brand.controller.js";
import { translateResponse } from "../middleware/translation.middleware.js";
import { cacheHeaders } from "../middleware/cache.middleware.js";
import { cache, clearCache } from "../middleware/cache.js";

const router = express.Router();
const headerCache = cacheHeaders(60, 300, 60);
const memCache = cache({ namespace: "brands", ttl: 60_000 });

// Public routes (static before dynamic)
router.get("/", headerCache, memCache, translateResponse, getAllBrands);
router.get("/slug/:slug", headerCache, memCache, translateResponse, getBrandBySlug);
router.get("/category/:categoryId", headerCache, memCache, translateResponse, getBrandsByCategory);

// Invalidate the brand list cache after any write.
const invalidate = (req, res, next) => { clearCache("brands"); next(); };

// Admin / Store routes
router.post("/", protectRoute, adminOrStoreRoute, invalidate, createBrand);
router.put("/:brandId", protectRoute, adminOrStoreRoute, invalidate, updateBrand);
router.delete("/:brandId", protectRoute, adminOrStoreRoute, invalidate, deleteBrand);
router.put("/delete/:brandId", protectRoute, adminOrStoreRoute, invalidate, safeDeleteBrand);
router.put("/restore/:brandId", protectRoute, adminOrStoreRoute, invalidate, restoreBrand);
router.put("/setBrandToProduct/:productId", protectRoute, adminOrStoreRoute, setBrandToProduct);

// Single brand (last)
router.get("/:brandId", translateResponse, getBrandById);

export default router;
