import express from "express";
import {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  getAllNotifications,
  createNotification,
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
  getPushKey,
  subscribePush,
  unsubscribePush,
} from "../controllers/notification.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

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

router.get("/:id", getNotificationById);
router.put("/:id/read", markAsRead);
router.put("/mark-all-read", markAllAsRead);
router.delete("/:id", deleteNotification);

/*
  Admin routes — which is what they were called and not what they were.

  `router.use(protectRoute)` above is the only guard the file had, so any
  signed-in customer could read every user's notifications (`/admin/all`
  populates the recipient's name, email and role, so it is an order and
  approval history for the whole shop) and post a notification to anybody —
  which the model's `post("save")` hook then delivers as a web push to that
  person's devices. A convincing "Action required" arriving on an
  administrator's phone from a customer account is a phishing primitive.
*/
router.get("/admin/all", adminRoute, getAllNotifications);
router.post("/admin/create", adminRoute, createNotification);

export default router;
