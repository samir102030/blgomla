import express from "express";
import {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getStoreCoupons,
  toggleCouponStatus,
  getCouponByCode,
  getPublicCoupons,
} from "../controllers/coupon.controller.js";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public — storefront collectible coupon strip
router.get("/public", getPublicCoupons);

// All routes below require authentication
router.use(protectRoute);

// Shoppers apply a code at the cart and at checkout, so this stays open to any
// signed-in user. It answers only about the one code supplied.
router.post("/validate", validateCoupon);

// ── Management ──
// These carried no gate beyond protectRoute, so every route here was reachable
// by any signed-in shopper. `getAllCoupons` in particular had no final `else`
// branch and handed a customer the entire coupon table, codes and all.
// Permission keys rather than role names, so revoking coupons.* from a role in
// Roles & Access actually takes effect.
router.post("/", requirePermission("coupons.create"), createCoupon);
router.get("/", requirePermission("coupons.view"), getAllCoupons);
router.get("/code/:code", requirePermission("coupons.view"), getCouponByCode);
router.get("/store/:storeId", requirePermission("coupons.view"), getStoreCoupons);
router.get("/:couponId", requirePermission("coupons.view"), getCouponById);
router.put("/:couponId", requirePermission("coupons.edit"), updateCoupon);
router.patch("/:couponId/toggle", requirePermission("coupons.edit"), toggleCouponStatus);
router.delete("/:couponId", requirePermission("coupons.delete"), deleteCoupon);

export default router;
