import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../stores/notification.store";
import { useTranslation } from "react-i18next";
import { getNotificationIcon } from "../lib/notificationIcons";
import { BellIcon } from "@heroicons/react/24/outline";

type NotificationFilter = "all" | "unread" | "read";

const FILTER_LABELS: Record<NotificationFilter, string> = {
  unread: "notification.filter.unread",
  read: "notification.filter.read",
  all: "notification.filter.all",
};

const FILTER_MODES: NotificationFilter[] = ["unread", "read", "all"];

const NotificationBell: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("unread");
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    const params: Record<string, any> = { page: 1, limit: 10 };
    if (filter === "unread") {
      params.read = false;
    } else if (filter === "read") {
      params.read = true;
    }
    fetchNotifications(params);
  }, [filter, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCardClick = async (
    notificationId: string,
    alreadyRead: boolean,
  ) => {
    if (alreadyRead) return;
    await markAsRead(notificationId);
  };

  const handleDeleteNotification = async (notificationId: string) => {
    await deleteNotification(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate("/notifications");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("notification.notifications")}
        title={t("notification.notifications")}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
      >
        <BellIcon className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-0 ltr:right-0 rtl:left-0 -translate-y-1/3 ltr:translate-x-1/3 rtl:-translate-x-1/3 bg-red-500 text-white text-[10px] font-bold leading-none rounded-full min-w-[1.1rem] h-[1.1rem] px-1 inline-flex items-center justify-center shadow ring-2 ring-[var(--surface)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-80 sm:ltr:right-0 sm:rtl:left-0 sm:left-auto sm:transform-none bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-gray-200 dark:border-slate-800 z-50">
          <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-slate-800 space-x-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("notification.notifications")}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {t("notification.realTime")}
              </p>
            </div>
            <button
              onClick={handleMarkAllAsRead}
              className={`px-3 py-1 text-xs font-semibold rounded-md border transition ${
                unreadCount === 0 || loading
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white"
              }`}
              disabled={unreadCount === 0 || loading}
            >
              {t("notification.markAllRead")}
            </button>
          </div>

          <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-800">
            <div className="flex flex-wrap gap-2">
              {FILTER_MODES.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilter(mode)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border transition ${
                    filter === mode
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
                  }`}
                >
                  {t(FILTER_LABELS[mode])}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-slate-400">
                {t("notification.loading")}
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-slate-400">
                {emptyMessage}
              </div>
            ) : (
              displayedNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`relative p-4 border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/60 cursor-pointer ${
                    !notification.read ? "bg-blue-50 dark:bg-slate-800/80" : ""
                  }`}
                  onClick={() =>
                    handleCardClick(notification._id, notification.read)
                  }
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">
                      {(() => { const Icon = getNotificationIcon(notification.type); return <Icon className="w-5 h-5" aria-hidden="true" />; })()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteNotification(notification._id);
                    }}
                    className="absolute top-2 ltr:right-2 rtl:left-2 text-[10px] font-semibold text-red-500 hover:text-red-700"
                  >
                    {t("notification.delete")}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-slate-800">
            <button
              onClick={handleViewAll}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800 dark:text-sky-300 dark:hover:text-sky-200"
            >
              {t("notification.viewAll")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
