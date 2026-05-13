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

const router = express.Router();

// Categories rarely change — give them a longer CDN window than products.
const publicCache = cacheHeaders(300, 1800);

// Public (static before dynamic)
router.get("/", publicCache, translateResponse, getAllCategories);
router.get("/tree", publicCache, translateResponse, getCategoryTree);
router.get("/slug/:slug", publicCache, translateResponse, getCategoryBySlug);

// Admin
router.post("/", protectRoute, adminRoute, createCategory);
router.put("/:categoryId", protectRoute, adminRoute, updateCategory);
router.delete("/:categoryId", protectRoute, adminRoute, deleteCategory);
router.put("/safeDelete/:categoryId", protectRoute, adminRoute, safeDeleteCategory);
router.put("/restore/:categoryId", protectRoute, adminRoute, restoreCategory);
router.put("/setCategoryToProduct/:productId", protectRoute, adminRoute, setCategoryToProduct);

// Nested resource lookups
router.get("/products/:categoryId", getProductsByCategory);
router.get("/:categoryId/brands", translateResponse, getBrandsInCategory);

// Single (last)
router.get("/:categoryId", translateResponse, getCategoryById);

export default router;
