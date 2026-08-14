import express from "express";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";
import {
  listChannels,
  createChannel,
  updateChannel,
  setChannelActive,
  deleteChannel,
} from "../controllers/paymobChannel.controller.js";

const router = express.Router();

// Payment credentials, so every route is behind the same permission and none
// of it is reachable without a session. There is no public read here — the
// storefront never needs to know which channel is live; checkout resolves it
// server-side when it creates the payment.
router.use(protectRoute, requirePermission("payments.channels"));

router.get("/", listChannels);
router.post("/", createChannel);
router.put("/:id", updateChannel);
router.patch("/:id/active", setChannelActive);
router.delete("/:id", deleteChannel);

export default router;
