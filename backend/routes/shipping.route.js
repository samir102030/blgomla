import express from "express";
import { getShipping, updateShipping } from "../controllers/shipping.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getShipping);
router.put("/", protectRoute, adminRoute, updateShipping);

export default router;
