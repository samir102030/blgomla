import express from "express";
import {
  createOrGetConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadMessageCount,
} from "../controllers/chat.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

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

export default router;
