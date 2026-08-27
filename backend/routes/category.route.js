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
import {
  getCategoryAudit,
  exportCategoryTree,
  fillCategoryImages,
  hideEmptyCategories,
} from "../controllers/categoryAudit.controller.js";
import {
  bulkUploadCategories,
  downloadCategoryTemplate,
} from "../controllers/bulkCategory.controller.js";
import multer from "multer";
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
// The response depends on `includeHidden`. Both caches key on the full URL,
// query string included, so the dashboard's answer and the storefront's are
// stored apart — which is the only reason it is safe to vary the body by a
// query parameter on a cached route at all.
router.get("/", publicCache, memCache, translateResponse, getAllCategories);
router.get("/tree", publicCache, memCache, translateResponse, getCategoryTree);
router.get("/slug/:slug", publicCache, memCache, translateResponse, getCategoryBySlug);

// Bulk upload. Registered before "/:categoryId" so "bulk-template" is not read
// as an id. Excel only, held in memory — the sheet is parsed, never stored.
const uploadSheet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    cb(allowed.includes(file.mimetype) ? null : new Error("Only Excel files (.xlsx, .xls) are allowed"), allowed.includes(file.mimetype));
  },
});

router.get(
  "/bulk-template",
  protectRoute,
  requirePermission("categories.manage"),
  downloadCategoryTemplate
);
router.post(
  "/bulk-upload",
  protectRoute,
  requirePermission("categories.manage"),
  uploadSheet.single("file"),
  invalidate,
  bulkUploadCategories
);

// Admin
/*
  Departments with no picture, and departments with nothing in them.

  Read first, then act — the two actions are separate calls on purpose, so
  seeing the list is never the same gesture as changing it. Both invalidate
  the storefront cache, because both change what a visitor sees.
*/
router.get("/audit/gaps", protectRoute, requirePermission("categories.manage"), getCategoryAudit);
router.get("/export/tree", protectRoute, requirePermission("categories.manage"), exportCategoryTree);
router.post("/audit/fill-images", protectRoute, requirePermission("categories.manage"), invalidate, fillCategoryImages);
router.post("/audit/hide-empty", protectRoute, requirePermission("categories.manage"), invalidate, hideEmptyCategories);

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
