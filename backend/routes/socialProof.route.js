import express from "express";
import { getRecentPurchases } from "../controllers/socialProof.controller.js";

const router = express.Router();

// Public
router.get("/recent-purchases", getRecentPurchases);

export default router;
