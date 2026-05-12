import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../stores/notification.store";
import { getNotificationIcon } from "../lib/notificationIcons";
import type { Notification } from "../types/notification.type";

type NotificationFilter = "all" | "unread" | "read";

const FILTER_LABELS: Record<NotificationFilter, string> = {
  unread: "notification.filter.unread",
  read: "notification.filter.read",
  all: "notification.filter.all",
};

const FILTER_MODES: NotificationFilter[] = ["all", "unread", "read"];

// Route a notification to the most relevant page based on its type.
// The model has no explicit link field, so this is a best-effort mapping.
function routeForNotification(n: Notification): string | null {
  switch (n.type) {
    case "order":
      return "/account?tab=orders";
    case "promotion":
      return "/products";
    case "system":
    case "info":
    case "warning":
    case "error":
    case "success":
    default:
      return null;
  }
}

function groupByDate(items: Notification[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;

  const groups: Record<string, Notification[]> = {
    today: [],
    yesterday: [],
    week: [],
    earlier: [],
  };

  for (const n of items) {
    const t = new Date(n.createdAt).getTime();
    if (t >= startOfToday) groups.today.push(n);
    else if (t >= startOfYesterday) groups.yesterday.push(n);
    else if (t >= startOfWeek) groups.week.push(n);
    else groups.earlier.push(n);
  }
  return groups;
}

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
    if (filter === "unread") params.read = false;
    else if (filter === "read") params.read = true;
    fetchNotifications(params);
  }, [filter, fetchNotifications]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMin < 1) return t("Just now");
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    return date.toLocaleDateString();
  };

  const grouped = useMemo(() => groupByDate(notifications), [notifications]);

  const groupLabels: Record<string, string> = {
    today: t("Today"),
    yesterday: t("Yesterday"),
    week: t("This week"),
    earlier: t("Earlier"),
  };

  const handleRowClick = (n: Notification) => {
    if (!n.read) markAsRead(n._id);
    const route = routeForNotification(n);
    if (route) navigate(route);
  };

  const isEmpty = !loading && notifications.length === 0;

  return (
    <div className="bg-[var(--surface-2)] min-h-screen">
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <header className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)]">
                {t("notification.notifications")}
              </h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <span
                  className="inline-block h-2 w-2 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                {t("notification.realTime")}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                {t("Unread")}: <span className="font-semibold text-[var(--text)]">{unreadCount}</span>
              </span>
              <button
                onClick={markAllAsRead}
                disabled={loading || unreadCount === 0}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition ${
                  loading || unreadCount === 0
                    ? "bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)] cursor-not-allowed"
                    : "bg-[var(--brand-primary)] text-white border-transparent hover:opacity-90"
                }`}
              >
                {t("notification.markAllRead")}
              </button>
            </div>
          </div>

          <div
            className="flex gap-1 rounded-lg bg-[var(--surface)] p-1 border border-[var(--border)] w-fit"
            role="tablist"
          >
            {FILTER_MODES.map((mode) => (
              <button
                key={mode}
                role="tab"
                aria-selected={filter === mode}
                onClick={() => setFilter(mode)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                  filter === mode
                    ? "bg-[var(--brand-primary)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {t(FILTER_LABELS[mode])}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl border border-[var(--border)] bg-[var(--surface)] animate-shimmer"
              />
            ))}
          </div>
        ) : isEmpty ? (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-14 px-6 text-center">
            <div
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: "var(--brand-gradient)" }}
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10"
              >
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10 21a2 2 0 0 0 4 0" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text)]">
              {filter === "unread"
                ? t("You're all caught up")
                : filter === "read"
                ? t("No read notifications yet")
                : t("No notifications yet")}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-muted)]">
              {t(
                "Order updates, restock alerts, promotions, and replies will appear here."
              )}
            </p>
          </section>
        ) : (
          <div className="space-y-6">
            {(["today", "yesterday", "week", "earlier"] as const).map((key) => {
              const items = grouped[key];
              if (!items.length) return null;
              return (
                <section key={key}>
                  <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    {groupLabels[key]}
                  </h3>
                  <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
                    {items.map((n) => {
                      const clickable = !!routeForNotification(n) || !n.read;
                      return (
                        <article
                          key={n._id}
                          onClick={() => clickable && handleRowClick(n)}
                          className={`relative flex gap-3 px-4 sm:px-6 py-4 transition ${
                            clickable
                              ? "cursor-pointer hover:bg-[var(--surface-2)]"
                              : ""
                          } ${!n.read ? "bg-[var(--brand-primary)]/5" : ""}`}
                        >
                          {!n.read && (
                            <span
                              className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[var(--brand-primary)]"
                              aria-label={t("Unread")}
                            />
                          )}
                          <span className="text-2xl flex-shrink-0 ml-2 sm:ml-3">
                            {getNotificationIcon(n.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h2
                                className={`text-sm truncate ${
                                  !n.read
                                    ? "font-semibold text-[var(--text)]"
                                    : "font-medium text-[var(--text)]"
                                }`}
                              >
                                {n.title}
                              </h2>
                              <time className="text-xs text-[var(--text-muted)] flex-shrink-0">
                                {formatTime(n.createdAt)}
                              </time>
                            </div>
                            <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-2">
                              {n.message}
                            </p>
                            <div className="mt-2 flex gap-3 text-xs">
                              {!n.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(n._id);
                                  }}
                                  className="text-[var(--brand-primary)] hover:underline"
                                >
                                  {t("notification.markRead")}
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(n._id);
                                }}
                                className="text-[var(--text-muted)] hover:text-red-600 hover:underline"
                              >
                                {t("notification.delete")}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
