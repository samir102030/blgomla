import express from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";
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
router.post("/", protectRoute, requirePermission("mosaic.manage"), createMosaicCard);
router.get("/", protectRoute, requirePermission("mosaic.manage"), getAllMosaicCards);
router.put("/:mosaicCardId", protectRoute, requirePermission("mosaic.manage"), updateMosaicCard);
router.delete("/:mosaicCardId", protectRoute, requirePermission("mosaic.manage"), deleteMosaicCard);

export default router;
