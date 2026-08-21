import express from "express";
import {
  protectRoute,
  requirePermission,
  adminRoute,
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

// The same listing, for the dashboard.
//
// It has to be a separate path rather than optional auth on the public one:
// that route is cached by URL alone, so a response that varied by who asked
// would be handed to whoever asked next. This one carries no cache headers
// and requires a session, which is what lets the handler confine the results
// to the categories the account is responsible for.
router.get(
  "/manage",
  protectRoute,
  requirePermission("products.view"),
  translateResponse,
  validateGetAllProducts,
  getAllProducts,
);
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
// `storeRoute` is literally role === "store", so admins and even super_admins
// were refused with "Access denied" — on the one route in this block whose own
// heading says ADMIN / STORE. createProduct has always branched on
// `req.user.role === "store"` to decide whether a product needs approval, so
// it was written for both; only the gate disagreed. This now matches every
// sibling route below: a permission check rather than a role check.
router.post("/", protectRoute, requirePermission("products.create"), validateCreateProduct, createProduct);
router.put("/bulk-update", protectRoute, adminRoute, bulkUpdateProducts);
router.get("/approvals", protectRoute, requirePermission("products.approve"), getProductApprovals);
router.get("/pricing-insights", protectRoute, requirePermission("products.view"), getPricingInsights);
router.post("/:productId/approve", protectRoute, requirePermission("products.approve"), approveProduct);
router.post("/:productId/reject", protectRoute, requirePermission("products.approve"), rejectProduct);
router.put("/:productId", protectRoute, requirePermission("products.edit"), requireProductAccess, validateUpdateProduct, updateProduct);
router.put("/sale/:productId", protectRoute, requirePermission("products.sale"), requireProductAccess, toggleSaleProduct);
router.put("/sale-schedule/:productId", protectRoute, requirePermission("products.sale"), requireProductAccess, scheduleSale);
router.put("/featured/:productId", protectRoute, requirePermission("products.feature"), requireProductAccess, toggleFeaturedProduct);
router.put("/stock/:productId", protectRoute, requirePermission("products.stock"), requireProductAccess, validateUpdateStock, updateProductStock);
router.delete("/delete/:productId", protectRoute, requirePermission("products.delete"), requireProductAccess, softDeleteProduct);
router.put("/restore/:productId", protectRoute, requirePermission("products.delete"), requireProductAccess, restoreProduct);
router.delete("/:productId", protectRoute, requirePermission("products.delete"), requireProductAccess, deleteProduct);

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
router.post("/:productId/features", protectRoute, requirePermission("products.edit"), validateAddFeature, addProductFeature);
router.put("/:productId/features", protectRoute, requirePermission("products.edit"), validateUpdateFeature, updateProductFeature);
router.delete("/:productId/features/:featureId", protectRoute, requirePermission("products.edit"), deleteProductFeature);

router.get("/:productId/attributes", getProductAttributes);
router.post("/:productId/attributes", protectRoute, requirePermission("products.edit"), validateAddAttribute, addProductAttribute);
router.put("/:productId/attributes/:attributeId", protectRoute, requirePermission("products.edit"), validateUpdateAttribute, updateProductAttribute);
router.delete("/:productId/attributes/:attributeId", protectRoute, requirePermission("products.edit"), deleteProductAttribute);

// ═══════════════════════════════════════════════
// PRICE SUGGESTIONS
// ═══════════════════════════════════════════════
router.post("/:productId/suggest-price", suggestPrice);
router.get("/:productId/price-suggestions", protectRoute, requirePermission("products.view"), getPriceSuggestions);
router.put("/:productId/price-suggestions/:suggestionId", protectRoute, requirePermission("products.approve"), reviewPriceSuggestion);

// ═══════════════════════════════════════════════
// COMPETITOR PRICES
// ═══════════════════════════════════════════════
router.get("/:productId/competitor-prices", getCompetitorPrices);
router.post("/:productId/competitor-prices", protectRoute, requirePermission("products.edit"), addCompetitorPrice);
router.put("/:productId/competitor-prices/:competitorId", protectRoute, requirePermission("products.edit"), updateCompetitorPrice);
router.delete("/:productId/competitor-prices/:competitorId", protectRoute, requirePermission("products.edit"), deleteCompetitorPrice);

// ═══════════════════════════════════════════════
// SINGLE PRODUCT (must be LAST)
// ═══════════════════════════════════════════════
router.get("/:productId", translateResponse, getProductById);

export default router;
