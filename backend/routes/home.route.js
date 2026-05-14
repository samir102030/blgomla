import express from "express";
import { getHomeFeed } from "../controllers/homeFeed.controller.js";
import { translateResponse } from "../middleware/translation.middleware.js";
import { cacheHeaders } from "../middleware/cache.middleware.js";
import { cache } from "../middleware/cache.js";

const router = express.Router();

router.get(
  "/",
  cacheHeaders(60, 300, 30),
  cache({ namespace: "home-feed", ttl: 30_000 }),
  translateResponse,
  getHomeFeed
);

export default router;
