import express from "express";
import { recoverAbandonedCarts } from "../controllers/cron.controller.js";

const router = express.Router();

// Triggered by Vercel Cron (see vercel.json). Auth via CRON_SECRET bearer token.
router.get("/cart-recovery", recoverAbandonedCarts);

export default router;
