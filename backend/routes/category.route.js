import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  getProductsByCategory,
  restoreCategory,
  safeDeleteCategory,
  setCategoryToProduct,
  updateCategory,
} from "../controllers/category.controller.js";

const router = express.Router();

router.post("/", protectRoute, adminRoute, createCategory);
router.get("/", getAllCategories);
router.get("/:categoryId", getCategoryById);
router.put("/:categoryId", protectRoute, adminRoute, updateCategory);
router.delete("/:categoryId", protectRoute, adminRoute, deleteCategory);
router.put(
  "/safeDelete/:categoryId",
  protectRoute,
  adminRoute,
  safeDeleteCategory
);
router.put("/restore/:categoryId", protectRoute, adminRoute, restoreCategory);
router.get("/products/:categoryId", getProductsByCategory);
router.put(
  "/setCategoryToProduct/:productId",
  protectRoute,
  adminRoute,
  setCategoryToProduct
);
export default router;
