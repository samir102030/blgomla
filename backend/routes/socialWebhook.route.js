import express from "express";
import {
  verify,
  receiveMeta,
  receiveTikTok,
  status,
} from "../controllers/socialWebhook.controller.js";

const router = express.Router();

/**
 * Mounted in app.js ahead of the global rate limiter, the coming-soon gate and
 * the visitor tracker — none of which this traffic should meet.
 *
 * The limiter is sized for browsers: a shop that goes viral for an evening
 * would have Meta's webhook 429'd, and Meta responds to that by retrying and
 * then by disabling the subscription. The coming-soon gate would answer the
 * verification GET with a splash page and the app would refuse to save the
 * webhook. And the visitor tracker would file Meta's servers as shoppers.
 *
 * The endpoint is not thereby unprotected: every POST is rejected unless it
 * carries a valid signature, which is a stronger check than any of the three.
 */
router.get("/webhook/meta", verify);
router.post("/webhook/meta", receiveMeta);

router.post("/webhook/tiktok", receiveTikTok);

router.get("/status", status);

export default router;
