import express from "express";
import {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
  getAllNotifications,
  createNotification,
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
  getPushKey,
  subscribePush,
  unsubscribePush,
} from "../controllers/notification.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All notification routes require authentication
router.use(protectRoute);

// User routes
router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.get("/preferences", getMyNotificationPreferences);
router.put("/preferences", updateMyNotificationPreferences);

// Web push (must be before /:id wildcard)
router.get("/push-key", getPushKey);
router.post("/push-subscribe", subscribePush);
router.delete("/push-subscribe", unsubscribePush);

// Clear the whole list. Above "/:id" for the same reason the push routes are:
// a literal that sits below the wildcard is never reached — the wildcard takes
// "all" as an id and the request dies as a malformed ObjectId.
router.delete("/all", deleteAllNotifications);

router.get("/:id", getNotificationById);
router.put("/:id/read", markAsRead);
router.put("/mark-all-read", markAllAsRead);
router.delete("/:id", deleteNotification);

// Admin routes (additional routes for admin functionality)
router.get("/admin/all", getAllNotifications);
router.post("/admin/create", createNotification);

export default router;
