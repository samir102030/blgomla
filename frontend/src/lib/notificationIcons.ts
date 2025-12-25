import type { Notification } from "../types/notification.type";

const ICON_MAP: Record<Notification["type"], string> = {
  info: "ℹ️",
  warning: "⚠️",
  success: "✔️",
  error: "⛔",
  order: "🛒",
  promotion: "🎁",
  system: "✨",
};

export const getNotificationIcon = (type: Notification["type"]) => {
  return ICON_MAP[type] ?? "🔔";
};
