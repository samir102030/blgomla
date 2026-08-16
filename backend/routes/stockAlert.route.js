import express from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";
import { listStockAlerts } from "../controllers/stockAlert.controller.js";

const router = express.Router();

// Subscribing is public and lives on the product route (POST /products/:id/notify).
// Reading the resulting demand log is staff-only.
router.get("/", protectRoute, requirePermission("products.view"), listStockAlerts);

export default router;
