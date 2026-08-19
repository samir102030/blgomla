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
  moveCategoryProducts,
  restoreCategory,
  safeDeleteCategory,
  setCategoryToProduct,
  updateCategory,
} from "../controllers/category.controller.js";
import {
  bulkUploadCategories,
  createHeldCategories,
  downloadCategoryTemplate,
  exportCategories,
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
router.get("/", publicCache, memCache, translateResponse, getAllCategories);
router.get("/tree", publicCache, memCache, translateResponse, getCategoryTree);
router.get("/slug/:slug", publicCache, memCache, translateResponse, getCategoryBySlug);

// Bulk upload. Registered before "/:categoryId" so "bulk-template" is not read
// as an id. Excel only, held in memory — the sheet is parsed, never stored.
// Sized so a full /export can be uploaded back — that round trip is what the
// export is for, and a ceiling below it makes the feature unusable at scale.
const MAX_SHEET_BYTES = 25 * 1024 * 1024;

const uploadSheet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SHEET_BYTES },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    cb(allowed.includes(file.mimetype) ? null : new Error("Only Excel files (.xlsx, .xls) are allowed"), allowed.includes(file.mimetype));
  },
});

/** Multer rejections as something the uploader can act on, not a bare 500. */
const handleSheetErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: `That file is larger than the ${Math.round(
        MAX_SHEET_BYTES / 1024 / 1024
      )}MB limit.`,
    });
  }
  if (err) return res.status(400).json({ success: false, message: err.message });
  next();
};

router.get(
  "/bulk-template",
  protectRoute,
  requirePermission("categories.manage"),
  downloadCategoryTemplate
);
// The tree as a sheet, in the template's own column order so it can be edited
// and uploaded back.
router.get(
  "/export",
  protectRoute,
  requirePermission("categories.manage"),
  exportCategories
);
router.post(
  "/bulk-upload",
  protectRoute,
  requirePermission("categories.manage"),
  uploadSheet.single("file"),
  handleSheetErrors,
  invalidate,
  bulkUploadCategories
);
// Writes the rows /bulk-upload held back, each with the parent chosen in the UI.
// JSON, not a file — the sheet's values travel back in the request body.
router.post(
  "/bulk-held",
  protectRoute,
  requirePermission("categories.manage"),
  invalidate,
  createHeldCategories
);

// Admin
router.post("/", protectRoute, requirePermission("categories.manage"), invalidate, createCategory);
router.put("/:categoryId", protectRoute, requirePermission("categories.manage"), invalidate, updateCategory);
router.delete("/:categoryId", protectRoute, requirePermission("categories.manage"), invalidate, deleteCategory);
router.put("/safeDelete/:categoryId", protectRoute, requirePermission("categories.manage"), invalidate, safeDeleteCategory);
router.put("/restore/:categoryId", protectRoute, requirePermission("categories.manage"), invalidate, restoreCategory);
router.put("/setCategoryToProduct/:productId", protectRoute, requirePermission("categories.manage"), setCategoryToProduct);
// Re-file a whole category's products in one call. Invalidates the storefront
// cache like the other writes here: the categories it moves between both change
// what they hold, and a stale feed would show the old counts.
router.post("/:categoryId/move-products", protectRoute, requirePermission("categories.manage"), invalidate, moveCategoryProducts);

// Nested resource lookups
router.get("/products/:categoryId", getProductsByCategory);
router.get("/:categoryId/brands", translateResponse, getBrandsInCategory);

// Single (last)
router.get("/:categoryId", translateResponse, getCategoryById);

export default router;
