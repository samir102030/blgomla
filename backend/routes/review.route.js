import express from "express";
import {
  protectRoute,
  adminOrStoreRoute,
} from "../middleware/auth.middleware.js";
import {
  getAllReviews,
  toggleReviewVisibility,
  deleteReview,
  getReviewStats,
} from "../controllers/review.controller.js";

const router = express.Router();

// All routes require authentication and admin/store role
router.use(protectRoute);
router.use(adminOrStoreRoute);

// Get all reviews with filtering and pagination
router.get("/", getAllReviews);

// Get review statistics
router.get("/stats", getReviewStats);

// Toggle review visibility (show/hide)
router.put("/:productId/:reviewId/visibility", toggleReviewVisibility);

// Delete review
router.delete("/:productId/:reviewId", deleteReview);

export default router;
