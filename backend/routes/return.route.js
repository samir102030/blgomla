import express from "express";
import {
  createReturnRequest,
  getMyReturns,
  getReturns,
  updateReturnStatus,
} from "../controllers/return.controller.js";
import {
  validateCreateReturn,
  validateUpdateReturnStatus,
} from "../validations/return.validate.js";
import {
  adminOrStoreRoute,
  protectRoute,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Customer: create a return request
router.post("/", protectRoute, validateCreateReturn, createReturnRequest);

// Customer: get their returns
router.get("/my-returns", protectRoute, getMyReturns);

// Admin/Store: list returns
router.get("/", protectRoute, adminOrStoreRoute, getReturns);

// Admin/Store: update return status
router.put(
  "/:id/status",
  protectRoute,
  adminOrStoreRoute,
  validateUpdateReturnStatus,
  updateReturnStatus
);

export default router;
