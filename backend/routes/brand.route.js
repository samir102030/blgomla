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
  getAllBrands,
  getBrandById,
} from "../controllers/brand.controller.js";
import { translateResponse } from "../middleware/translation.middleware.js";

const router = express.Router();

// Brand and Category CRUD
router.post("/", protectRoute, adminOrStoreRoute, createBrand);
router.put("/:brandId", protectRoute, adminOrStoreRoute, updateBrand);

router.delete("/:brandId", protectRoute, adminOrStoreRoute, deleteBrand);

router.put(
  "/delete/:brandId",
  protectRoute,
  adminOrStoreRoute,
  safeDeleteBrand
);

// Assign brand/category to product
router.put(
  "/setBrandToProduct/:productId",
  protectRoute,
  adminOrStoreRoute,
  setBrandToProduct
);

// Getters
router.get("/", translateResponse, getAllBrands);
router.get("/:brandId", translateResponse, getBrandById);

export default router;
