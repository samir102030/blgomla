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
} from "../controllers/notification.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All notification routes require authentication
router.use(protectRoute);

// User routes
router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.get("/:id", getNotificationById);
router.put("/:id/read", markAsRead);
router.put("/mark-all-read", markAllAsRead);
router.delete("/:id", deleteNotification);

// Admin routes (additional routes for admin functionality)
router.get("/admin/all", getAllNotifications);
router.post("/admin/create", createNotification);

export default router;
