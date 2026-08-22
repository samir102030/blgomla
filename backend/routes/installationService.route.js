import express from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";
import {
  getActiveInstallationServices,
  getAllInstallationServices,
  createInstallationService,
  updateInstallationService,
  deleteInstallationService,
  reorderInstallationServices,
  seedDefaultInstallationServices,
} from "../controllers/installationService.controller.js";

const router = express.Router();

// Both languages go to the storefront, which picks — see the note on the hero
// route for why `translateResponse` is not mounted here.
router.get("/active", getActiveInstallationServices);

const canManage = [protectRoute, requirePermission("advertisements.manage")];

router.get("/", ...canManage, getAllInstallationServices);
router.post("/", ...canManage, createInstallationService);
router.put("/reorder", ...canManage, reorderInstallationServices);
router.post("/seed-defaults", ...canManage, seedDefaultInstallationServices);
router.put("/:serviceId", ...canManage, updateInstallationService);
router.delete("/:serviceId", ...canManage, deleteInstallationService);

export default router;
