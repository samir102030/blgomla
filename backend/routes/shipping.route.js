import express from "express";
import { getShipping, updateShipping } from "../controllers/shipping.controller.js";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getShipping);
router.put("/", protectRoute, requirePermission("shipping.manage"), updateShipping);

export default router;
