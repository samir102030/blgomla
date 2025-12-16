import express from "express";
import {
  getAllBrandRequests,
  getBrandRequestById,
  approveBrandRequest,
  rejectBrandRequest,
} from "../controllers/brandRequest.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication and admin privileges
router.use(protectRoute);
router.use(adminRoute);

// Get all brand requests
router.get("/", getAllBrandRequests);

// Get brand request by ID
router.get("/:requestId", getBrandRequestById);

// Approve brand request
router.post("/:requestId/approve", approveBrandRequest);

// Reject brand request
router.post("/:requestId/reject", rejectBrandRequest);

export default router;
