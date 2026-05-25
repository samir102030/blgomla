import express from "express";
import {
  getRoles,
  getAssignableRoles,
  getPermissionRegistry,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/role.controller.js";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";

const router = express.Router();

// Assignable list is available to user managers (gated separately, before the
// roles.manage wall below).
router.get(
  "/assignable",
  protectRoute,
  requirePermission(["users.role", "users.edit", "roles.manage"]),
  getAssignableRoles
);

router.use(protectRoute, requirePermission("roles.manage"));

router.get("/permissions", getPermissionRegistry);
router.get("/", getRoles);
router.post("/", createRole);
router.put("/:key", updateRole);
router.delete("/:key", deleteRole);

export default router;
