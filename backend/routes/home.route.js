import express from "express";
import { getHomeFeed } from "../controllers/homeFeed.controller.js";
import { translateResponse } from "../middleware/translation.middleware.js";
import { cacheHeaders } from "../middleware/cache.middleware.js";

const router = express.Router();

router.get("/", cacheHeaders(60, 300), translateResponse, getHomeFeed);

export default router;
