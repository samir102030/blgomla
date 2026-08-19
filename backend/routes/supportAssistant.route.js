import express from "express";
import { ask, handoff } from "../controllers/supportAssistant.controller.js";
import { optionalAuth } from "../middleware/optionalAuth.middleware.js";
import { supportAssistantLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

// Open to visitors: see the note on the controller. `optionalAuth` decides who
// is asking; the tools decide what that person is allowed to be told.
router.use(optionalAuth, supportAssistantLimiter);

router.post("/ask", ask);
router.post("/handoff", handoff);

export default router;
