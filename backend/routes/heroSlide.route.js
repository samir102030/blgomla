import express from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";
import {
  getActiveHeroSlides,
  getAllHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  reorderHeroSlides,
  seedDefaultHeroSlides,
} from "../controllers/heroSlide.controller.js";

const router = express.Router();

/*
 * No `translateResponse` on the public route, on purpose.
 *
 * That middleware swaps `titleAr` into `title` when the request asks for
 * Arabic, which is right for a product the page only ever shows in one
 * language. The hero is edited in both at once and the storefront picks the
 * side it needs, so a swap here would hand the admin preview an Arabic title
 * in the English field and lose the English one entirely.
 */
router.get("/active", getActiveHeroSlides);

// `advertisements.manage` rather than a new permission key: the banner is the
// same job as the promo surfaces, whoever holds that key already runs them,
// and a fresh key would be missing from every role document already in the
// database until someone re-seeded them.
const canManage = [protectRoute, requirePermission("advertisements.manage")];

router.get("/", ...canManage, getAllHeroSlides);
router.post("/", ...canManage, createHeroSlide);
// Before "/:slideId" so "reorder" and "seed-defaults" are read as the routes
// they are rather than as an id that will never match.
router.put("/reorder", ...canManage, reorderHeroSlides);
router.post("/seed-defaults", ...canManage, seedDefaultHeroSlides);
router.put("/:slideId", ...canManage, updateHeroSlide);
router.delete("/:slideId", ...canManage, deleteHeroSlide);

export default router;
