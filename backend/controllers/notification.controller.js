import Notification from "../models/notification.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { paginateQuery } from "../utils/pagination.js";
import {
  emitNotificationCreated,
  emitNotificationDeleted,
  emitNotificationMarkAllRead,
  emitNotificationUpdated,
} from "../utils/socket.js";

// Get all notifications for the current user
export const getNotifications = controllerWrapper(
  "getNotifications",
  async (req, res) => {
    const { page = 1, limit = 20, read } = req.query;
    const userId = req.user._id;

    let query = { user: userId, deleted: false };

    // Filter by read status if specified
    if (read !== undefined) {
      query.read = read === "true";
    }

    const mongooseQuery = Notification.find(query).sort({ createdAt: -1 });
    const result = await paginateQuery(page, limit, mongooseQuery);

    res.status(200).json(result);
  }
);

// Get notification by ID
export const getNotificationById = controllerWrapper(
  "getNotificationById",
  async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: id,
      user: userId,
      deleted: false,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      notification,
    });
  }
);

// Mark notification as read
export const markAsRead = controllerWrapper("markAsRead", async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: userId, deleted: false },
    { read: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  emitNotificationUpdated(userId, notification);

  res.status(200).json({
    success: true,
    message: "Notification marked as read",
    notification,
  });
});

// Mark all notifications as read
export const markAllAsRead = controllerWrapper(
  "markAllAsRead",
  async (req, res) => {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { user: userId, read: false, deleted: false },
      { read: true }
    );

    emitNotificationMarkAllRead(userId);

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
    });
  }
);

// Delete notification (soft delete)
export const deleteNotification = controllerWrapper(
  "deleteNotification",
  async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: userId, deleted: false },
    { deleted: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  emitNotificationDeleted(userId, notification._id);

  res.status(200).json({
    success: true,
    message: "Notification deleted successfully",
    });
  }
);

// Get unread notification count
export const getUnreadCount = controllerWrapper(
  "getUnreadCount",
  async (req, res) => {
    const userId = req.user._id;

    const count = await Notification.countDocuments({
      user: userId,
      read: false,
      deleted: false,
    });

    res.status(200).json({
      success: true,
      unreadCount: count,
    });
  }
);

// Admin: Get all notifications (for admin dashboard)
export const getAllNotifications = controllerWrapper(
  "getAllNotifications",
  async (req, res) => {
    const { page = 1, limit = 20, userId, type, read } = req.query;

    let query = { deleted: false };

    if (userId) query.user = userId;
    if (type) query.type = type;
    if (read !== undefined) query.read = read === "true";

    const mongooseQuery = Notification.find(query)
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Admin: Create notification for specific user
export const createNotification = controllerWrapper(
  "createNotification",
  async (req, res) => {
    const { userId, title, message, type = "info" } = req.body;

    const notification = new Notification({
      user: userId,
      title,
      message,
      type,
    });

    await notification.save();

    emitNotificationCreated(notification.user, notification);

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      notification,
    });
  }
);
