import express from "express";
import {
  protectRoute,
  adminOrStoreRoute,
  adminRoute,
  storeRoute,
  requireProductAccess,
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
  getProductBySlug,
  getProductFeatures,
  getProductsByBrand,
  getProductsByCategory,
  getRelatedProducts,
  getFrequentlyBoughtTogether,
  getProductsByIds,
  getPricingInsights,
  getSaleProducts,
  getSearchSuggestions,
  getStoreProducts,
  getStorefrontProducts,
  removeFromCart,
  restoreProduct,
  getProductApprovals,
  approveProduct,
  rejectProduct,
  softDeleteProduct,
  toggleFeaturedProduct,
  toggleSaleProduct,
  scheduleSale,
  updateCart,
  updateProduct,
  updateProductAttribute,
  updateProductFeature,
  updateProductReview,
  updateProductStock,
  checkReviewEligibility,
  bulkUpdateProducts,
  suggestPrice,
  getPriceSuggestions,
  reviewPriceSuggestion,
  addCompetitorPrice,
  getCompetitorPrices,
  updateCompetitorPrice,
  deleteCompetitorPrice,
} from "../controllers/product.controller.js";
import { subscribeStockAlert } from "../controllers/stockAlert.controller.js";

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
import { cacheHeaders } from "../middleware/cache.middleware.js";

const router = express.Router();

// Shared CDN cache for public product listings — 60s fresh, 5min stale-while-revalidate.
// First visitor warms the cold function; subsequent visitors get instant edge-cached responses.
const publicListCache = cacheHeaders(60, 300);

// ═══════════════════════════════════════════════
// PUBLIC: Static routes MUST come before /:productId
// ═══════════════════════════════════════════════
router.get("/", publicListCache, translateResponse, validateGetAllProducts, getAllProducts);
router.get("/storefront", publicListCache, translateResponse, getStorefrontProducts);
router.get("/search-suggestions", publicListCache, translateResponse, getSearchSuggestions);
router.get("/featured", publicListCache, translateResponse, getFeaturedProducts);
router.get("/newest", publicListCache, translateResponse, getNewestProducts);
router.get("/bestSellers", publicListCache, translateResponse, getBestSellers);
router.get("/mostRated", publicListCache, translateResponse, getMostRatedProducts);
router.post("/by-ids", translateResponse, getProductsByIds);
router.get("/saleProducts", publicListCache, translateResponse, getSaleProducts);
router.get("/filter", translateResponse, validateFilterProducts, filterProducts);
router.get("/category/:categoryId", translateResponse, getProductsByCategory);
router.get("/brand/:brandId", translateResponse, getProductsByBrand);
router.get("/store/:storeId", translateResponse, getStoreProducts);
router.get("/slug/:slug", translateResponse, getProductBySlug);

// ═══════════════════════════════════════════════
// CART (authenticated)
// ═══════════════════════════════════════════════
router.post("/cart", protectRoute, addProductToCart);
router.get("/cart", translateResponse, protectRoute, getCart);
router.put("/cart/:productId", protectRoute, updateCart);
router.delete("/cart/:productId", protectRoute, removeFromCart);

// ═══════════════════════════════════════════════
// ADMIN / STORE: Product management
// ═══════════════════════════════════════════════
router.post("/", protectRoute, storeRoute, validateCreateProduct, createProduct);
router.put("/bulk-update", protectRoute, adminRoute, bulkUpdateProducts);
router.get("/approvals", protectRoute, adminRoute, getProductApprovals);
router.get("/pricing-insights", protectRoute, adminOrStoreRoute, getPricingInsights);
router.post("/:productId/approve", protectRoute, adminRoute, approveProduct);
router.post("/:productId/reject", protectRoute, adminRoute, rejectProduct);
router.put("/:productId", protectRoute, adminOrStoreRoute, requireProductAccess, validateUpdateProduct, updateProduct);
router.put("/sale/:productId", protectRoute, adminOrStoreRoute, requireProductAccess, toggleSaleProduct);
router.put("/sale-schedule/:productId", protectRoute, adminOrStoreRoute, requireProductAccess, scheduleSale);
router.put("/featured/:productId", protectRoute, adminOrStoreRoute, requireProductAccess, toggleFeaturedProduct);
router.put("/stock/:productId", protectRoute, adminOrStoreRoute, requireProductAccess, validateUpdateStock, updateProductStock);
router.delete("/delete/:productId", protectRoute, adminOrStoreRoute, requireProductAccess, softDeleteProduct);
router.put("/restore/:productId", protectRoute, adminOrStoreRoute, requireProductAccess, restoreProduct);
router.delete("/:productId", protectRoute, adminOrStoreRoute, requireProductAccess, deleteProduct);

// ═══════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════
router.get("/:productId/reviews/eligibility", protectRoute, checkReviewEligibility);
router.post("/:productId/reviews", protectRoute, validateAddReview, addProductReview);
router.put("/:productId/reviews/:reviewId", protectRoute, validateUpdateReview, updateProductReview);
router.delete("/:productId/reviews/:reviewId", protectRoute, deleteProductReview);

// ═══════════════════════════════════════════════
// RELATED PRODUCTS (you may also like)
// ═══════════════════════════════════════════════
router.get("/:productId/related", publicListCache, translateResponse, getRelatedProducts);
router.get("/:productId/frequently-bought-together", publicListCache, translateResponse, getFrequentlyBoughtTogether);
router.post("/:productId/notify", subscribeStockAlert);

// ═══════════════════════════════════════════════
// FEATURES & ATTRIBUTES
// ═══════════════════════════════════════════════
router.get("/:productId/features", getProductFeatures);
router.post("/:productId/features", protectRoute, adminOrStoreRoute, validateAddFeature, addProductFeature);
router.put("/:productId/features", protectRoute, adminOrStoreRoute, validateUpdateFeature, updateProductFeature);
router.delete("/:productId/features/:featureId", protectRoute, adminOrStoreRoute, deleteProductFeature);

router.get("/:productId/attributes", getProductAttributes);
router.post("/:productId/attributes", protectRoute, adminOrStoreRoute, validateAddAttribute, addProductAttribute);
router.put("/:productId/attributes/:attributeId", protectRoute, adminOrStoreRoute, validateUpdateAttribute, updateProductAttribute);
router.delete("/:productId/attributes/:attributeId", protectRoute, adminOrStoreRoute, deleteProductAttribute);

// ═══════════════════════════════════════════════
// PRICE SUGGESTIONS
// ═══════════════════════════════════════════════
router.post("/:productId/suggest-price", suggestPrice);
router.get("/:productId/price-suggestions", protectRoute, adminOrStoreRoute, getPriceSuggestions);
router.put("/:productId/price-suggestions/:suggestionId", protectRoute, adminRoute, reviewPriceSuggestion);

// ═══════════════════════════════════════════════
// COMPETITOR PRICES
// ═══════════════════════════════════════════════
router.get("/:productId/competitor-prices", getCompetitorPrices);
router.post("/:productId/competitor-prices", protectRoute, adminOrStoreRoute, addCompetitorPrice);
router.put("/:productId/competitor-prices/:competitorId", protectRoute, adminOrStoreRoute, updateCompetitorPrice);
router.delete("/:productId/competitor-prices/:competitorId", protectRoute, adminOrStoreRoute, deleteCompetitorPrice);

// ═══════════════════════════════════════════════
// SINGLE PRODUCT (must be LAST)
// ═══════════════════════════════════════════════
router.get("/:productId", translateResponse, getProductById);

export default router;
