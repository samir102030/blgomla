import express from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  getCategoryTree,
  getProductsByCategory,
  getBrandsInCategory,
  restoreCategory,
  safeDeleteCategory,
  setCategoryToProduct,
  updateCategory,
} from "../controllers/category.controller.js";
import { translateResponse } from "../middleware/translation.middleware.js";
import { cacheHeaders } from "../middleware/cache.middleware.js";
import { cache } from "../middleware/cache.js";
import { invalidateStorefront } from "../utils/storefrontCache.js";

const router = express.Router();

// Categories rarely change, so the CDN window stays generous. The *browser*
// window does not: max-age was 300, so an operator who added or hid a category
// watched their own storefront ignore them for five minutes and reasonably
// concluded it had not saved. maxAge 0 makes the browser revalidate every
// time — cheap, because the response is small and the server answers it from
// memory, and stale-while-revalidate means no visitor waits on it.
const publicCache = cacheHeaders(60, 300, 0);
const memCache = cache({ namespace: "categories", ttl: 5 * 60_000 });
// Clears the home feed too — it is built from categories and cached
// separately, so clearing only this namespace left the front page showing the
// catalogue as it was before the edit.
const invalidate = invalidateStorefront("categories");

// Public (static before dynamic)
router.get("/", publicCache, memCache, translateResponse, getAllCategories);
router.get("/tree", publicCache, memCache, translateResponse, getCategoryTree);
router.get("/slug/:slug", publicCache, memCache, translateResponse, getCategoryBySlug);

// Admin
router.post("/", protectRoute, requirePermission("categories.manage"), invalidate, createCategory);
router.put("/:categoryId", protectRoute, requirePermission("categories.manage"), invalidate, updateCategory);
router.delete("/:categoryId", protectRoute, requirePermission("categories.manage"), invalidate, deleteCategory);
router.put("/safeDelete/:categoryId", protectRoute, requirePermission("categories.manage"), invalidate, safeDeleteCategory);
router.put("/restore/:categoryId", protectRoute, requirePermission("categories.manage"), invalidate, restoreCategory);
router.put("/setCategoryToProduct/:productId", protectRoute, requirePermission("categories.manage"), setCategoryToProduct);

// Nested resource lookups
router.get("/products/:categoryId", getProductsByCategory);
router.get("/:categoryId/brands", translateResponse, getBrandsInCategory);

// Single (last)
router.get("/:categoryId", translateResponse, getCategoryById);

export default router;
