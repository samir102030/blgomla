import express from "express";
import {
  getAllCategoryRequests,
  getCategoryRequestById,
  approveCategoryRequest,
  rejectCategoryRequest,
} from "../controllers/categoryRequest.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication and admin privileges
router.use(protectRoute);
router.use(adminRoute);

// Get all category requests
router.get("/", getAllCategoryRequests);

// Get category request by ID
router.get("/:requestId", getCategoryRequestById);

// Approve category request
router.post("/:requestId/approve", approveCategoryRequest);

// Reject category request
router.post("/:requestId/reject", rejectCategoryRequest);

export default router;
