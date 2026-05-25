import express from "express";
import {
  getAllCategoryRequests,
  getCategoryRequestById,
  approveCategoryRequest,
  rejectCategoryRequest,
} from "../controllers/categoryRequest.controller.js";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication and admin privileges
router.use(protectRoute);
router.use(requirePermission("categories.manage"));

// Get all category requests
router.get("/", getAllCategoryRequests);

// Get category request by ID
router.get("/:requestId", getCategoryRequestById);

// Approve category request
router.post("/:requestId/approve", approveCategoryRequest);

// Reject category request
router.post("/:requestId/reject", rejectCategoryRequest);

export default router;
