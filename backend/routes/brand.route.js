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

const router = express.Router();

// Public routes (static before dynamic)
router.get("/", translateResponse, getAllBrands);
router.get("/slug/:slug", translateResponse, getBrandBySlug);
router.get("/category/:categoryId", translateResponse, getBrandsByCategory);

// Admin / Store routes
router.post("/", protectRoute, adminOrStoreRoute, createBrand);
router.put("/:brandId", protectRoute, adminOrStoreRoute, updateBrand);
router.delete("/:brandId", protectRoute, adminOrStoreRoute, deleteBrand);
router.put("/delete/:brandId", protectRoute, adminOrStoreRoute, safeDeleteBrand);
router.put("/restore/:brandId", protectRoute, adminOrStoreRoute, restoreBrand);
router.put("/setBrandToProduct/:productId", protectRoute, adminOrStoreRoute, setBrandToProduct);

// Single brand (last)
router.get("/:brandId", translateResponse, getBrandById);

export default router;
