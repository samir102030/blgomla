import express from "express";
import {
  protectRoute,
  requirePermission,
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

// Authenticated + at least review viewing access for everything here.
router.use(protectRoute);
router.use(requirePermission("reviews.view"));

const canManage = requirePermission("reviews.manage");

// Get all reviews with filtering and pagination
router.get("/", getAllReviews);

// Get review statistics
router.get("/stats", getReviewStats);

// Request endpoints (for vendors)
router.post("/:productId/:reviewId/request-hide", canManage, requestHideReview);
router.post("/:productId/:reviewId/request-delete", canManage, requestDeleteReview);
router.post("/:productId/:reviewId/request-unhide", canManage, requestUnhideReview);

// Admin request management endpoints
router.get("/requests/list/all", getReviewRequests);
router.get("/requests/vendor/my-requests", getVendorReviewRequests);
router.put("/:productId/requests/:requestId/approve", canManage, approveReviewRequest);
router.put("/:productId/requests/:requestId/reject", canManage, rejectReviewRequest);

// Toggle review visibility (show/hide)
router.put("/:productId/:reviewId/visibility", canManage, toggleReviewVisibility);

// Delete review
router.delete("/:productId/:reviewId", canManage, deleteReview);

export default router;
