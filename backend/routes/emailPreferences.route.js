import express from "express";
import { unsubscribeEmail } from "../controllers/emailPreferences.controller.js";

const router = express.Router();

// One-click unsubscribe — token-based, no auth required. POST is the
// RFC 8058 List-Unsubscribe-Post target used by Gmail/Outlook one-click.
router.get("/unsubscribe", unsubscribeEmail);
router.post("/unsubscribe", express.urlencoded({ extended: false }), unsubscribeEmail);

export default router;
