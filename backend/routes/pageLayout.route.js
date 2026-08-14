import express from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";
import { cacheHeaders } from "../middleware/cache.middleware.js";
import { cache } from "../middleware/cache.js";
import {
  getRegistry,
  getLayout,
  getLayoutForEditor,
  saveLayout,
  resetLayout,
} from "../controllers/pageLayout.controller.js";

const router = express.Router();

// The editor's routes come first: "registry" would otherwise be captured by
// the public /:page parameter below.
router.get("/registry", protectRoute, requirePermission("layout.manage"), getRegistry);
router.get("/:page/edit", protectRoute, requirePermission("layout.manage"), getLayoutForEditor);
router.put("/:page", protectRoute, requirePermission("layout.manage"), saveLayout);
router.post("/:page/reset", protectRoute, requirePermission("layout.manage"), resetLayout);

// Public: the storefront reads the published arrangement on every page load,
// so it is cached like the rest of the home feed.
router.get(
  "/:page",
  cacheHeaders(60, 300, 30),
  cache({ namespace: "page-layout", ttl: 30_000 }),
  getLayout
);

export default router;
