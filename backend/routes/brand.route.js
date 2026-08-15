import express from "express";
import {
  protectRoute,
  requirePermission,
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
import { cache } from "../middleware/cache.js";
import { invalidateStorefront } from "../utils/storefrontCache.js";

const router = express.Router();
// maxAge 0 for the same reason as categories: whoever changes what the
// storefront shows has to see the result on their next refresh.
const headerCache = cacheHeaders(60, 300, 0);
const memCache = cache({ namespace: "brands", ttl: 60_000 });

// Public routes (static before dynamic)
router.get("/", headerCache, memCache, translateResponse, getAllBrands);
router.get("/slug/:slug", headerCache, memCache, translateResponse, getBrandBySlug);
router.get("/category/:categoryId", headerCache, memCache, translateResponse, getBrandsByCategory);

// Invalidate the brand list cache after any write.
// Also clears the home feed — the brand strip on the front page is served
// from there, not from this namespace.
const invalidate = invalidateStorefront("brands");

// Admin / Store routes
router.post("/", protectRoute, requirePermission("brands.manage"), invalidate, createBrand);
router.put("/:brandId", protectRoute, requirePermission("brands.manage"), invalidate, updateBrand);
router.delete("/:brandId", protectRoute, requirePermission("brands.manage"), invalidate, deleteBrand);
router.put("/delete/:brandId", protectRoute, requirePermission("brands.manage"), invalidate, safeDeleteBrand);
router.put("/restore/:brandId", protectRoute, requirePermission("brands.manage"), invalidate, restoreBrand);
router.put("/setBrandToProduct/:productId", protectRoute, requirePermission("brands.manage"), setBrandToProduct);

// Single brand (last)
router.get("/:brandId", translateResponse, getBrandById);

export default router;
