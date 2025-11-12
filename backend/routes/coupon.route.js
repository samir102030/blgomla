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
} from "../controllers/coupon.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All coupon routes require authentication
router.use(protectRoute);

// Coupon CRUD routes
router.post("/", createCoupon);
router.get("/", getAllCoupons);
router.get("/:couponId", getCouponById);
router.put("/:couponId", updateCoupon);
router.delete("/:couponId", deleteCoupon);

// Additional routes
router.post("/validate", validateCoupon);
router.get("/code/:code", getCouponByCode);
router.get("/store/:storeId", getStoreCoupons);
router.patch("/:couponId/toggle", toggleCouponStatus);

export default router;
