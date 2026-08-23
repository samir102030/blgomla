import express from "express";
import {
  submitContactMessage,
  listContactMessages,
  updateContactMessage,
} from "../controllers/contact.controller.js";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";
import { contactLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

/*
  Sending is open, because a contact page exists for the person who does not
  have an account. That makes it the one write on this API an anonymous
  stranger can perform, so it is rate limited by address rather than trusted.
*/
router.post("/", contactLimiter, submitContactMessage);

// Reading is not. The messages carry customers' names, addresses and
// telephone numbers.
router.get("/", protectRoute, requirePermission("support.view"), listContactMessages);
router.patch(
  "/:id",
  protectRoute,
  requirePermission("support.view"),
  updateContactMessage
);

export default router;
