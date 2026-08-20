import express from "express";
import { listSections, resetSection } from "../controllers/dataReset.controller.js";
import { protectRoute, superAdminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Super admin only, and deliberately not permission-gated: emptying a section
// is not something a custom role should be able to be granted by accident.
router.use(protectRoute, superAdminRoute);

router.get("/sections", listSections);
router.post("/sections/:key", resetSection);

export default router;
