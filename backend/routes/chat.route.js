import express from "express";
import {
  createOrGetConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadMessageCount,
  mergeDuplicateGeneralConversations,
} from "../controllers/chat.controller.js";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";

const router = express.Router();

// All chat routes require authentication
router.use(protectRoute);

// Conversation management
router.post("/conversations", createOrGetConversation);
router.get("/conversations", getUserConversations);

// Message management
router.get("/conversations/:conversationId/messages", getConversationMessages);
router.post("/conversations/:conversationId/messages", sendMessage);
router.put("/conversations/:conversationId/read", markMessagesAsRead);

// Unread count
router.get("/unread-count", getUnreadMessageCount);

/*
  Merge the duplicate general threads the old behaviour left behind.

  A one-off, run by hand, so it is a POST with a `dryRun` rather than
  something that happens on deploy: it repoints messages between documents,
  and the operator should see the count before it does. Behind `support.view`
  — the permission that already decides who reads this inbox.
*/
router.post(
  "/admin/merge-duplicate-generals",
  requirePermission("support.view"),
  mergeDuplicateGeneralConversations
);

export default router;
