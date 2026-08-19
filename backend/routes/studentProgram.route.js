import express from "express";
import {
  addProgramDomain,
  applyForStudentProgram,
  getMyStudentProfile,
  getProgramSettings,
  getPublicProgram,
  getStudentStats,
  listStudentMembers,
  removeProgramDomain,
  runStudentMaintenance,
  updateProgramDomain,
  updateProgramSettings,
  updateStudentMember,
  verifyStudentEmail,
} from "../controllers/studentProgram.controller.js";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ── Public ──
   The portal has to render, and the confirmation link has to work, before and
   without a session: the link is opened from a university webmail that may be
   signed into nothing on this site. */
router.get("/program", getPublicProgram);
router.post("/verify", verifyStudentEmail);
router.post("/verify/:token", verifyStudentEmail);

/* ── The student's own membership ── */
router.get("/me", protectRoute, getMyStudentProfile);
router.post("/apply", protectRoute, applyForStudentProgram);

/* ── Administration ──
   Split three ways on purpose: reading the member list, acting on a member,
   and changing who qualifies are different levels of trust. */
router.get("/admin/settings", protectRoute, requirePermission("students.view"), getProgramSettings);
router.put("/admin/settings", protectRoute, requirePermission("students.configure"), updateProgramSettings);

router.post("/admin/domains", protectRoute, requirePermission("students.configure"), addProgramDomain);
router.patch(
  "/admin/domains/:domainId",
  protectRoute,
  requirePermission("students.configure"),
  updateProgramDomain,
);
router.delete(
  "/admin/domains/:domainId",
  protectRoute,
  requirePermission("students.configure"),
  removeProgramDomain,
);

router.get("/admin/members", protectRoute, requirePermission("students.view"), listStudentMembers);
router.patch("/admin/members/:id", protectRoute, requirePermission("students.manage"), updateStudentMember);
router.get("/admin/stats", protectRoute, requirePermission("students.view"), getStudentStats);

/* Renewal and expiry sweep. Guarded like the other maintenance endpoints
   rather than left open, because it writes. */
router.post(
  "/admin/maintenance",
  protectRoute,
  requirePermission("students.manage"),
  runStudentMaintenance,
);

export default router;
