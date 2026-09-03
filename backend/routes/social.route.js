import express from "express";
import { verifyWebhook, receiveWebhook } from "../controllers/socialWebhook.controller.js";

const router = express.Router();

/*
  No auth middleware and no rate limiter of ours on these two.

  The caller is Meta, not a browser: there is no cookie to check, and the
  identity proof is the SHA-256 signature the controller verifies against the
  app secret before it reads a single field. The global limiter in `app.js`
  already covers the path, and Meta's own delivery is the ceiling on volume.
*/
router.get("/meta", verifyWebhook);
router.post("/meta", receiveWebhook);

export default router;
