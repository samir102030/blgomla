import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import { subscribe, getSubscribers } from "../controllers/subscriber.controller.js";

const router = express.Router();

// Public
router.post("/", subscribe);

// Admin
router.get("/", protectRoute, adminRoute, getSubscribers);

export default router;
