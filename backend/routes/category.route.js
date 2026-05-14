import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
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
import { cache, clearCache } from "../middleware/cache.js";

const router = express.Router();

// Categories rarely change — give them a longer CDN window than products.
const publicCache = cacheHeaders(300, 1800, 300);
const memCache = cache({ namespace: "categories", ttl: 5 * 60_000 });
const invalidate = (req, res, next) => { clearCache("categories"); next(); };

// Public (static before dynamic)
router.get("/", publicCache, memCache, translateResponse, getAllCategories);
router.get("/tree", publicCache, memCache, translateResponse, getCategoryTree);
router.get("/slug/:slug", publicCache, memCache, translateResponse, getCategoryBySlug);

// Admin
router.post("/", protectRoute, adminRoute, invalidate, createCategory);
router.put("/:categoryId", protectRoute, adminRoute, invalidate, updateCategory);
router.delete("/:categoryId", protectRoute, adminRoute, invalidate, deleteCategory);
router.put("/safeDelete/:categoryId", protectRoute, adminRoute, invalidate, safeDeleteCategory);
router.put("/restore/:categoryId", protectRoute, adminRoute, invalidate, restoreCategory);
router.put("/setCategoryToProduct/:productId", protectRoute, adminRoute, setCategoryToProduct);

// Nested resource lookups
router.get("/products/:categoryId", getProductsByCategory);
router.get("/:categoryId/brands", translateResponse, getBrandsInCategory);

// Single (last)
router.get("/:categoryId", translateResponse, getCategoryById);

export default router;
