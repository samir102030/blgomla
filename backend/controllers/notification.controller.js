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

  /*
    The endpoint is a URL this server will POST to, on its own initiative,
    every time the account gets a notification — and it was whatever string
    the client sent. That is a blind SSRF with a trigger the caller controls:
    register `http://169.254.169.254/...` or an address on the deploy's own
    network and the server delivers to it forever.

    Only the real push services, only over https.
  */
  let host;
  try {
    const url = new URL(String(endpoint));
    if (url.protocol !== "https:") throw new Error("not https");
    host = url.hostname.toLowerCase();
  } catch {
    return res.status(400).json({ success: false, message: "Invalid subscription" });
  }
  const PUSH_HOSTS = [
    "fcm.googleapis.com",              // Chrome, Edge, Android
    "updates.push.services.mozilla.com", // Firefox
    "web.push.apple.com",              // Safari
    "wns2-.*\\.notify\\.windows\\.com",  // legacy Windows
  ];
  const allowed = PUSH_HOSTS.some((h) =>
    h.includes("*") || h.includes("\\.") ? new RegExp(`^${h}$`).test(host) : host === h
  );
  if (!allowed) {
    return res.status(400).json({ success: false, message: "Unsupported push service" });
  }

  /*
    One entry per endpoint, newest keys win, ten devices at most.

    `$addToSet` was wrong in both directions. It only dedupes byte-identical
    objects, so the same browser re-registering with rotated keys — which is
    what a service worker does — added a second entry for the same device;
    and there was no ceiling, so the array grew on the user document without
    bound and every notification fanned out across all of it.

    `$pull` then `$push` rather than one operation, because Mongo will not
    take both on the same field in a single update. Two round trips on an
    action that happens once per browser per subscription renewal.
  */
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { pushSubscriptions: { endpoint } },
  });
  await User.findByIdAndUpdate(req.user._id, {
    $push: {
      pushSubscriptions: { $each: [{ endpoint, keys }], $slice: -10 },
    },
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
