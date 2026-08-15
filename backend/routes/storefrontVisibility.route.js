import express from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";
import {
  listForVisibility,
  updateVisibility,
} from "../controllers/storefrontVisibility.controller.js";

const router = express.Router();

/**
 * Gated on the same permission that already governs editing the thing itself:
 * deciding a category is hidden from the storefront is an editorial act of the
 * same weight as renaming it, so it needs no permission of its own.
 */
const permissionFor = (req, res, next) => {
  const perm =
    req.params.kind === "brands" ? "brands.manage" : "categories.manage";
  return requirePermission(perm)(req, res, next);
};

router.get("/:kind", protectRoute, permissionFor, listForVisibility);
router.put("/:kind", protectRoute, permissionFor, updateVisibility);

export default router;
