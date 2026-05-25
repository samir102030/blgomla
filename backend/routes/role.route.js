import express from "express";
import {
  getRoles,
  getPermissionRegistry,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/role.controller.js";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute, requirePermission("roles.manage"));

router.get("/permissions", getPermissionRegistry);
router.get("/", getRoles);
router.post("/", createRole);
router.put("/:key", updateRole);
router.delete("/:key", deleteRole);

export default router;
