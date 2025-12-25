import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNotificationStore } from "../stores/notification.store";
import { getNotificationIcon } from "../lib/notificationIcons";

type NotificationFilter = "all" | "unread" | "read";

const FILTER_LABELS: Record<NotificationFilter, string> = {
  unread: "notification.filter.unread",
  read: "notification.filter.read",
  all: "notification.filter.all",
};

const FILTER_MODES: NotificationFilter[] = ["unread", "read", "all"];

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshUnreadCount,
    unreadCount,
  } = useNotificationStore();

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    const params: Record<string, any> = { page: 1, limit: 50 };
    if (filter === "unread") {
      params.read = false;
    } else if (filter === "read") {
      params.read = true;
    }
    fetchNotifications(params);
  }, [filter, fetchNotifications]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString();
  };

  const emptyMessage =
    filter === "unread"
      ? t("notification.noUnread")
      : filter === "read"
      ? t("notification.noRead")
      : t("notification.noNotifications");

  const displayedNotifications = notifications;

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <header className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {t("notification.notifications")}
              </h1>
              <p className="text-sm text-gray-500">
                {t("notification.realTime")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="text-xs uppercase tracking-wide text-gray-400">
                Unread: {unreadCount}
              </span>
              <button
                onClick={markAllAsRead}
                disabled={loading || unreadCount === 0}
                className={`px-3 py-1 text-xs font-semibold rounded-md border transition ${
                  loading || unreadCount === 0
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white"
                }`}
              >
                {t("notification.markAllRead")}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTER_MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-3 py-1 text-xs font-semibold rounded-full border transition ${
                  filter === mode
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {t(FILTER_LABELS[mode])}
              </button>
            ))}
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-500">
              {t("notification.loading")}
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              {emptyMessage}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayedNotifications.map((notification) => (
                <article
                  key={notification._id}
                  className="relative flex cursor-pointer flex-col gap-3 px-6 py-4 transition hover:bg-gray-50"
                  onClick={() => !notification.read && markAsRead(notification._id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-gray-900 truncate">
                          {notification.title}
                        </h2>
                        {!notification.read && (
                          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            {t("notification.filter.unread")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-xs text-gray-400">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {!notification.read && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          markAsRead(notification._id);
                        }}
                        className="px-2 py-1 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white"
                      >
                        {t("notification.markRead")}
                      </button>
                    )}
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteNotification(notification._id);
                      }}
                      className="px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-600 hover:text-white"
                    >
                      {t("notification.delete")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default NotificationsPage;
