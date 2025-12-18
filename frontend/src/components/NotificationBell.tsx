import React, { useState, useEffect, useRef } from "react";
import { useNotificationStore } from "../stores/notification.store";
import type { Notification } from "../types/notification.type";
import { useTranslation } from "react-i18next";

const NotificationBell: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    hideReadNotifications,
    toggleHideReadNotifications,
    showAllNotifications,
  } = useNotificationStore();

  const unreadCount = getUnreadCount();

  useEffect(() => {
    // Fetch notifications on component mount
    fetchNotifications({ page: 1, limit: 10 });
  }, [fetchNotifications]);

  useEffect(() => {
    // Close dropdown when clicking outside
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

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleToggleHideRead = () => {
    toggleHideReadNotifications();
  };

  const handleShowAll = () => {
    showAllNotifications();
  };

  // Filter notifications based on hideReadNotifications setting
  const displayedNotifications = hideReadNotifications
    ? notifications.filter((notif) => !notif.read)
    : notifications;

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

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      case "order":
        return "📦";
      case "promotion":
        return "🎉";
      case "system":
        return "🔧";
      default:
        return "ℹ️";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col items-center text-gray-800 hover:text-gray-600 transition-colors relative"
      >
        <span className="text-xl mb-1">🔔</span>
        <span className="text-xs hidden sm:block">{t('notification.notifications')}</span>
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('notification.notifications')}
            </h3>
            <div className="flex items-center space-x-2">
              {hideReadNotifications ? (
                <button
                  onClick={handleShowAll}
                  className="text-sm text-green-600 hover:text-green-800"
                  disabled={loading}
                >
                  {t('notification.showAll')}
                </button>
              ) : (
                <button
                  onClick={handleToggleHideRead}
                  className="text-sm text-orange-600 hover:text-orange-800"
                  disabled={loading}
                >
                  {t('notification.hideRead')}
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  disabled={loading}
                >
                  {t('notification.markAllRead')}
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                {t('notification.loading')}
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {hideReadNotifications
                  ? t('notification.noUnread')
                  : t('notification.noNotifications')}
              </div>
            ) : (
              displayedNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleMarkAsRead(notification._id)}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => {
                // Navigate to full notifications page
                setIsOpen(false);
                // You can add navigation logic here
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800"
            >
              {t('notification.viewAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
