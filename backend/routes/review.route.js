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
  requestHideReview,
  requestDeleteReview,
  requestUnhideReview,
  getReviewRequests,
  getVendorReviewRequests,
  approveReviewRequest,
  rejectReviewRequest,
} from "../controllers/review.controller.js";

const router = express.Router();

// All routes require authentication and admin/store role
router.use(protectRoute);
router.use(adminOrStoreRoute);

// Get all reviews with filtering and pagination
router.get("/", getAllReviews);

// Get review statistics
router.get("/stats", getReviewStats);

// Request endpoints (for vendors)
router.post("/:productId/:reviewId/request-hide", requestHideReview);
router.post("/:productId/:reviewId/request-delete", requestDeleteReview);
router.post("/:productId/:reviewId/request-unhide", requestUnhideReview);

// Admin request management endpoints
router.get("/requests/list/all", getReviewRequests);
router.get("/requests/vendor/my-requests", getVendorReviewRequests);
router.put("/:productId/requests/:requestId/approve", approveReviewRequest);
router.put("/:productId/requests/:requestId/reject", rejectReviewRequest);

// Toggle review visibility (show/hide) - Admin only
router.put("/:productId/:reviewId/visibility", toggleReviewVisibility);

// Delete review - Admin only
router.delete("/:productId/:reviewId", deleteReview);

export default router;
