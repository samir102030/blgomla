import express from "express";
import multer from "multer";
import {
  addProgramDomain,
  applyForStudentProgram,
  getMyStudentProfile,
  getProgramSettings,
  getPublicProgram,
  previewStudentDiscount,
  getStudentStats,
  listStudentMembers,
  removeProgramDomain,
  runStudentMaintenance,
  updateProgramDomain,
  updateProgramSettings,
  updateStudentMember,
  verifyStudentEmail,
} from "../controllers/studentProgram.controller.js";
import {
  createStudentCategory,
  createStudentProduct,
  deleteStudentCategory,
  deleteStudentProduct,
  getStudentProduct,
  getStudentShelf,
  getStudentTree,
  listStudentCategories,
  listStudentProducts,
  updateStudentCategory,
  updateStudentProduct,
} from "../controllers/studentCatalog.controller.js";
import {
  bulkUploadStudentCategories,
  bulkUploadStudentProducts,
  downloadStudentCategoryTemplate,
  downloadStudentProductTemplate,
  exportStudentProducts,
} from "../controllers/studentBulk.controller.js";
import { purgeElectronicsCatalogue } from "../controllers/electronicsPurge.controller.js";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";
import {
  studentMailIpLimiter,
  studentMailLimiter,
  studentVerifyLimiter,
} from "../middleware/rateLimit.middleware.js";

const router = express.Router();

/* Sheets are held in memory and parsed straight through — nothing is written
   to disk, so there is no upload directory to clean up or to leak. Same limit
   and same accepted types as the shop's own bulk upload. */
const uploadSheet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
  },
});

/* ── Public ──
   The portal has to render, and the confirmation link has to work, before and
   without a session: the link is opened from a university webmail that may be
   signed into nothing on this site. */
router.get("/program", getPublicProgram);
// The shelf and its departments are readable by anyone: a student decides
// whether the section is worth proving enrolment for by looking at what is on
// it.
router.get("/shop", getStudentShelf);
router.get("/shop/tree", getStudentTree);
router.post("/verify", studentVerifyLimiter, verifyStudentEmail);
router.post("/verify/:token", studentVerifyLimiter, verifyStudentEmail);

/* ── The student's own membership ── */
router.get("/me", protectRoute, getMyStudentProfile);
// The basket asking what the membership is worth on it. A POST because the
// lines go in the body, not because anything here changes.
router.post("/discount/preview", protectRoute, previewStudentDiscount);

/* Applying sends mail from the shop's own sending domain, so it is limited
   twice: once per account and once per network. The controller also holds a
   two-minute cooldown per account, which is what a student who clicks twice
   runs into; these are the ceilings for someone who is not a student. The
   account limiter is keyed on `req.user`, so `protectRoute` has to run
   first. */
router.post(
  "/apply",
  studentMailIpLimiter,
  protectRoute,
  studentMailLimiter,
  applyForStudentProgram,
);

/* ── Administration ──
   Split three ways on purpose: reading the member list, acting on a member,
   and changing who qualifies are different levels of trust. */
router.get("/admin/settings", protectRoute, requirePermission("students.view"), getProgramSettings);
router.put("/admin/settings", protectRoute, requirePermission("students.configure"), updateProgramSettings);

router.post("/admin/domains", protectRoute, requirePermission("students.configure"), addProgramDomain);
router.patch(
  "/admin/domains/:domainId",
  protectRoute,
  requirePermission("students.configure"),
  updateProgramDomain,
);
router.delete(
  "/admin/domains/:domainId",
  protectRoute,
  requirePermission("students.configure"),
  removeProgramDomain,
);

router.get("/admin/members", protectRoute, requirePermission("students.view"), listStudentMembers);
router.patch("/admin/members/:id", protectRoute, requirePermission("students.manage"), updateStudentMember);
router.get("/admin/stats", protectRoute, requirePermission("students.view"), getStudentStats);

/* ── The section's own catalogue ──
   Its departments and its products, kept behind `students.configure`: this is
   what the section sells and what it charges, which is a different level of
   trust from reading the member list. */
/* Bulk loading. Registered before "/:id" so "bulk-template" is not read as an
   id, which is the classic way this breaks. */
router.get(
  "/admin/catalog/categories/bulk-template",
  protectRoute,
  requirePermission("students.configure"),
  downloadStudentCategoryTemplate,
);
router.post(
  "/admin/catalog/categories/bulk-upload",
  protectRoute,
  requirePermission("students.configure"),
  uploadSheet.single("file"),
  bulkUploadStudentCategories,
);
router.get(
  "/admin/catalog/products/bulk-template",
  protectRoute,
  requirePermission("students.configure"),
  downloadStudentProductTemplate,
);
router.get(
  "/admin/catalog/products/export",
  protectRoute,
  requirePermission("students.view"),
  exportStudentProducts,
);
router.post(
  "/admin/catalog/products/bulk-upload",
  protectRoute,
  requirePermission("students.configure"),
  uploadSheet.single("file"),
  bulkUploadStudentProducts,
);

/* Emptying the branch before reloading it. Registered beside the uploads it
   pairs with, and before "/:id" for the same reason they are. */
router.post(
  "/admin/catalog/purge",
  protectRoute,
  requirePermission("students.configure"),
  purgeElectronicsCatalogue,
);

router
  .route("/admin/catalog/categories")
  .all(protectRoute)
  .get(requirePermission("students.view"), listStudentCategories)
  .post(requirePermission("students.configure"), createStudentCategory);

router
  .route("/admin/catalog/categories/:id")
  .all(protectRoute, requirePermission("students.configure"))
  .patch(updateStudentCategory)
  .delete(deleteStudentCategory);

router
  .route("/admin/catalog/products")
  .all(protectRoute)
  .get(requirePermission("students.view"), listStudentProducts)
  .post(requirePermission("students.configure"), createStudentProduct);

router
  .route("/admin/catalog/products/:id")
  .all(protectRoute)
  .get(requirePermission("students.view"), getStudentProduct)
  .patch(requirePermission("students.configure"), updateStudentProduct)
  .delete(requirePermission("students.configure"), deleteStudentProduct);

/* Renewal and expiry sweep. Guarded like the other maintenance endpoints
   rather than left open, because it writes. */
router.post(
  "/admin/maintenance",
  protectRoute,
  requirePermission("students.manage"),
  runStudentMaintenance,
);

export default router;
