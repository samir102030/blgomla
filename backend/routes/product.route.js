import express from "express";
import {
  protectRoute,
  adminOrStoreRoute,
  adminRoute,
  storeRoute,
} from "../middleware/auth.middleware.js";
import {
  addProductAttribute,
  addProductFeature,
  addProductReview,
  addProductToCart,
  createProduct,
  deleteProduct,
  deleteProductAttribute,
  deleteProductFeature,
  deleteProductReview,
  filterProducts,
  getAllProducts,
  getBestSellers,
  getCart,
  getFeaturedProducts,
  getMostRatedProducts,
  getNewestProducts,
  getProductAttributes,
  getProductById,
  getProductFeatures,
  getProductsByBrand,
  getProductsByCategory,
  getSaleProducts,
  getStoreProducts,
  removeFromCart,
  restoreProduct,
  getProductApprovals,
  approveProduct,
  rejectProduct,
  softDeleteProduct,
  toggleFeaturedProduct,
  toggleSaleProduct,
  updateCart,
  updateProduct,
  updateProductAttribute,
  updateProductFeature,
  updateProductReview,
  updateProductStock,
  checkReviewEligibility,
} from "../controllers/product.controller.js";

import {
  validateCreateProduct,
  validateUpdateProduct,
  validateUpdateStock,
  validateAddReview,
  validateUpdateReview,
  validateAddFeature,
  validateUpdateFeature,
  validateAddAttribute,
  validateUpdateAttribute,
  validateGetAllProducts,
  validateFilterProducts,
} from "../validations/product.validate.js";

import { translateResponse } from "../middleware/translation.middleware.js";

const router = express.Router();

// Public routes
router.get("/", translateResponse, validateGetAllProducts, getAllProducts); // can search also
router.get("/featured", translateResponse, getFeaturedProducts);
router.get("/category/:categoryId", translateResponse, getProductsByCategory); // not tested
router.get("/brand/:brandId", translateResponse, getProductsByBrand); // not tested
router.get("/store/:storeId", translateResponse, getStoreProducts);
router.get("/saleProducts", translateResponse, getSaleProducts);
router.get("/filter", translateResponse, validateFilterProducts, filterProducts); // Filter products based on criteria [price, category, brand, etc.]

// filter products

// Protected routes (admin)
router.post(
  "/",
  protectRoute,
  storeRoute,
  validateCreateProduct,
  createProduct
); // Create product
router.get(
  "/approvals",
  protectRoute,
  adminRoute,
  getProductApprovals
);
router.post(
  "/:productId/approve",
  protectRoute,
  adminRoute,
  approveProduct
);
router.post(
  "/:productId/reject",
  protectRoute,
  adminRoute,
  rejectProduct
);
router.put(
  "/:productId",
  protectRoute,
  adminOrStoreRoute,
  validateUpdateProduct,
  updateProduct
); // Update product
router.put(
  "/sale/:productId",
  protectRoute,
  adminOrStoreRoute,
  toggleSaleProduct
); // Toggle sale status
router.put(
  "/featured/:productId",
  protectRoute,
  adminOrStoreRoute,
  toggleFeaturedProduct
); // Toggle featured status
router.put(
  "/stock/:productId",
  protectRoute,
  adminOrStoreRoute,
  validateUpdateStock,
  updateProductStock
); // Update product stock
router.delete(
  "/delete/:productId",
  protectRoute,
  adminOrStoreRoute,
  softDeleteProduct
); // Soft delete product
router.put(
  "/restore/:productId",
  protectRoute,
  adminOrStoreRoute,
  restoreProduct
); // Restore soft deleted product
router.delete("/:productId", protectRoute, adminOrStoreRoute, deleteProduct); // Delete product

// Reviews (authenticated users)
router.get(
  "/:productId/reviews/eligibility",
  protectRoute,
  checkReviewEligibility
); // Check if user can review this product
router.post(
  "/:productId/reviews",
  protectRoute,
  validateAddReview,
  addProductReview
); // Add review to product
router.put(
  "/:productId/reviews/:reviewId",
  protectRoute,
  validateUpdateReview,
  updateProductReview
); // Update product review
router.delete(
  "/:productId/reviews/:reviewId",
  protectRoute,
  deleteProductReview
); // Delete product review

// features of the product
router.get("/:productId/features", getProductFeatures); // Get product features
router.post(
  "/:productId/features",
  protectRoute,
  adminOrStoreRoute,
  validateAddFeature,
  addProductFeature
); // Add feature to product
router.put(
  "/:productId/features",
  protectRoute,
  adminOrStoreRoute,
  validateUpdateFeature,
  updateProductFeature
); // Update product feature

// attributes of the product
router.get("/:productId/attributes", getProductAttributes); // Get product attributes
router.post(
  "/:productId/attributes",
  protectRoute,
  adminOrStoreRoute,
  validateAddAttribute,
  addProductAttribute
); // Add attribute to product
router.put(
  "/:productId/attributes/:attributeId",
  protectRoute,
  adminOrStoreRoute,
  validateUpdateAttribute,
  updateProductAttribute
); // Update product attribute
router.delete(
  "/:productId/attributes/:attributeId",
  protectRoute,
  adminOrStoreRoute,
  deleteProductAttribute
); // Delete product attribute

router.get("/newest", translateResponse, getNewestProducts); // Get newest products
router.get("/bestSellers", translateResponse, getBestSellers); // Get best sellers products
router.get("/mostRated", translateResponse, getMostRatedProducts); // Get Most rated products

// cart for user
router.post("/cart", protectRoute, addProductToCart); // Add product to cart
router.get("/cart", translateResponse, protectRoute, getCart); // Get cart
router.put("/cart/:productId", protectRoute, updateCart); // Update cart
router.delete("/cart/:productId", protectRoute, removeFromCart); // Remove product from cart

router.get("/:productId", translateResponse, getProductById);
export default router;
