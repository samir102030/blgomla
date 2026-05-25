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
  requirePermission,
  protectRoute,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Customer: create a return request
router.post("/", protectRoute, validateCreateReturn, createReturnRequest);

// Customer: get their returns
router.get("/my-returns", protectRoute, getMyReturns);

// Returns viewers: list returns
router.get("/", protectRoute, requirePermission("returns.view"), getReturns);

// Returns managers: update return status
router.put(
  "/:id/status",
  protectRoute,
  requirePermission("returns.manage"),
  validateUpdateReturnStatus,
  updateReturnStatus
);

export default router;
