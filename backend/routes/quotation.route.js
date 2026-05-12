import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
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
router.get("/", protectRoute, adminRoute, listQuotations);
router.get("/stats", protectRoute, adminRoute, getQuotationStats);
router.get("/:quotationId", protectRoute, adminRoute, getQuotation);
router.get("/:quotationId/pdf", protectRoute, adminRoute, generateQuotationPDF);
router.put("/:quotationId", protectRoute, adminRoute, updateQuotationStatus);
router.delete("/:quotationId", protectRoute, adminRoute, deleteQuotation);

export default router;
