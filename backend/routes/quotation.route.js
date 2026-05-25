import express from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";
import {
  createQuotation,
  listQuotations,
  getQuotation,
  updateQuotationStatus,
  deleteQuotation,
  getQuotationStats,
  generateQuotationPDF,
} from "../controllers/quotation.controller.js";

const router = express.Router();

// Public: create quotation (anyone can request a quote)
// Auth is optional — if logged in, user ID is attached
router.post("/", async (req, res, next) => {
  // Try to attach user if auth header present, but don't block
  try {
    await new Promise((resolve) => protectRoute(req, res, resolve));
  } catch {
    // No auth, continue as guest
  }
  createQuotation(req, res, next);
});

// Admin routes
router.get("/", protectRoute, requirePermission("quotations.view"), listQuotations);
router.get("/stats", protectRoute, requirePermission("quotations.view"), getQuotationStats);
router.get("/:quotationId", protectRoute, requirePermission("quotations.view"), getQuotation);
router.get("/:quotationId/pdf", protectRoute, requirePermission("quotations.view"), generateQuotationPDF);
router.put("/:quotationId", protectRoute, requirePermission("quotations.manage"), updateQuotationStatus);
router.delete("/:quotationId", protectRoute, requirePermission("quotations.manage"), deleteQuotation);

export default router;
