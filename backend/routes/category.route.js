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

/*
  The dashboard reads this route too, and it must not be cached at the edge.

  `includeHidden=true` is the dashboard's list — the one with a checkbox on
  every row. Keying both caches on the full URL keeps its answer apart from the
  storefront's, which is what the note above is about, but "apart" is not the
  same as "fresh": Vercel's edge held the dashboard's copy for a minute of its
  own accord. Measured, twice in a row a second apart: `x-vercel-cache: MISS`
  then `HIT, age: 2`.

  What that looked like from a chair: tick the box, the PUT lands and saves,
  the page refetches, the edge answers with the list from before the tick, and
  the checkbox goes back to where it was. Every toggle on that screen, every
  time — a control that visibly does nothing.

  Clearing the server's own cache on write, which the PUT already does, cannot
  reach a copy held in front of it. So the admin list opts out of caching
  altogether. It is one small response, read by a handful of people, and it is
  the one read in the shop that happens immediately after a write.

  The storefront's answer — nobody has just edited it, and everybody asks for
  it — is cached exactly as before.
*/
const listCache = (req, res, next) => {
  if (req.query.includeHidden) {
    res.set("Cache-Control", "private, no-store");
    // Past the server's own store as well. The PUT clears that one, but it
    // clears it on the way in rather than after the save, so a read landing in
    // between could put the old answer straight back. The dashboard's list is
    // the one read in the shop that must simply be true.
    return next();
  }
  return publicCache(req, res, () => memCache(req, res, next));
};

// Public (static before dynamic)
// The response depends on `includeHidden`. Both caches key on the full URL,
// query string included, so the dashboard's answer and the storefront's are
// stored apart — which is the only reason it is safe to vary the body by a
// query parameter on a cached route at all.
router.get("/", listCache, translateResponse, getAllCategories);
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
