import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import { translateResponse } from "../middleware/translation.middleware.js";
import {
  createMosaicCard,
  getAllMosaicCards,
  getActiveMosaicCards,
  updateMosaicCard,
  deleteMosaicCard,
} from "../controllers/mosaicCard.controller.js";

const router = express.Router();

// Public
router.get("/active", translateResponse, getActiveMosaicCards);

// Admin
router.post("/", protectRoute, adminRoute, createMosaicCard);
router.get("/", protectRoute, adminRoute, getAllMosaicCards);
router.put("/:mosaicCardId", protectRoute, adminRoute, updateMosaicCard);
router.delete("/:mosaicCardId", protectRoute, adminRoute, deleteMosaicCard);

export default router;
