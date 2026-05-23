import Notification from "../models/notification.model.js";
import NotificationPreferences from "../models/notificationPreferences.model.js";
import User from "../models/user.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { paginateQuery } from "../utils/pagination.js";
import {
  emitNotificationCreated,
  emitNotificationDeleted,
  emitNotificationMarkAllRead,
  emitNotificationUpdated,
} from "../utils/socket.js";
import { getPublicKey, isWebPushEnabled } from "../utils/webpush.js";

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

// ── Web Push ──
export const getPushKey = controllerWrapper("getPushKey", async (req, res) => {
  if (!isWebPushEnabled()) {
    return res.status(503).json({ success: false, message: "Push not configured" });
  }
  res.json({ success: true, publicKey: getPublicKey() });
});

export const subscribePush = controllerWrapper("subscribePush", async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ success: false, message: "Invalid subscription" });
  }
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { pushSubscriptions: { endpoint, keys } },
  });
  res.json({ success: true });
});

export const unsubscribePush = controllerWrapper("unsubscribePush", async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ success: false, message: "endpoint required" });
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { pushSubscriptions: { endpoint } },
  });
  res.json({ success: true });
});

// ── Notification Preferences ──
export const getMyNotificationPreferences = controllerWrapper(
  "getMyNotificationPreferences",
  async (req, res) => {
    let prefs = await NotificationPreferences.findOne({ user: req.user._id });
    if (!prefs) {
      prefs = await NotificationPreferences.create({ user: req.user._id });
    }
    res.status(200).json({ success: true, preferences: prefs });
  }
);

export const updateMyNotificationPreferences = controllerWrapper(
  "updateMyNotificationPreferences",
  async (req, res) => {
    const allowed = [
      "emailNotifications",
      "pushNotifications",
      "smsNotifications",
      "frequency",
      "quietHours",
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const prefs = await NotificationPreferences.findOneAndUpdate(
      { user: req.user._id },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true, preferences: prefs });
  }
);
