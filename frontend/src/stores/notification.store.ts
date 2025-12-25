import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../lib/axios";
import type {
  Notification,
  NotificationPreferences,
  NotificationStats,
} from "../types/notification.type";

interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  page: number;
  pages: number;
  success: boolean;
}

interface NotificationStore {
  // State
  notifications: Notification[];
  notification: Notification | undefined;
  preferences: NotificationPreferences | undefined;
  stats: NotificationStats | undefined;
  paginated: PaginatedResult<Notification> | undefined;
  loading: boolean;
  error: string | undefined;
  hideReadNotifications: boolean;
  unreadCount: number;

  // Notification Management
  fetchNotifications: (params?: Record<string, any>) => Promise<void>;
  fetchNotificationById: (notificationId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  deleteAllNotifications: () => Promise<boolean>;

  // Notification Creation (Admin)
  createNotification: (
    data: Partial<Notification>
  ) => Promise<Notification | undefined>;
  sendBulkNotification: (data: {
    title: string;
    message: string;
    type: Notification["type"];
    recipients: string[];
    actionUrl?: string;
    actionText?: string;
  }) => Promise<boolean>;

  // Preferences
  fetchPreferences: () => Promise<void>;
  updatePreferences: (
    preferences: Partial<NotificationPreferences>
  ) => Promise<boolean>;

  // Stats & Analytics
  fetchStats: () => Promise<void>;
  getUnreadCount: () => number;
  refreshUnreadCount: () => Promise<void>;

  // Real-time Updates
  addNotification: (notification: Notification) => void;
  updateNotification: (
    notificationId: string,
    updates: Partial<Notification>
  ) => void;
  removeNotification: (notificationId: string) => void;
  markLocalAllRead: () => void;

  // UI Controls
  toggleHideReadNotifications: () => void;
  showAllNotifications: () => void;

  // Utility
  clearError: () => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      // Initial State
      notifications: [],
      notification: undefined,
      preferences: undefined,
      stats: undefined,
      paginated: undefined,
      loading: false,
      error: undefined,
      hideReadNotifications: false,
      unreadCount: 0,

      // Fetch Notifications
      fetchNotifications: async (params = {}) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<
            PaginatedResult<Notification>
          >("/notifications", { params });
          set({
            notifications: data.data,
            paginated: data,
            loading: false,
          });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      refreshUnreadCount: async () => {
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            unreadCount: number;
          }>("/notifications/unread-count");
          set({ unreadCount: data.unreadCount });
        } catch (error: any) {
          console.error("Failed to refresh notification count", error);
        }
      },

      // Fetch Notification by ID
      fetchNotificationById: async (notificationId: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            notification: Notification;
          }>(`/notifications/${notificationId}`);
          set({ notification: data.notification, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Mark as Read
      markAsRead: async (notificationId: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.patch<{
            success: boolean;
            notification: Notification;
          }>(`/notifications/${notificationId}/read`);
          const updatedNotification = data.notification;
          set((state) => ({
            notifications: state.notifications.map((notif) =>
              notif._id === notificationId ? updatedNotification : notif
            ),
            loading: false,
          }));
          await get().refreshUnreadCount();
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Mark All as Read
      markAllAsRead: async () => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.put("/notifications/mark-all-read");
          set((state) => ({
            notifications: state.notifications.map((notif) => ({
              ...notif,
              read: true,
            })),
            loading: false,
          }));
          await get().refreshUnreadCount();
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Delete Notification
      deleteNotification: async (notificationId: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.delete(`/notifications/${notificationId}`);
          set((state) => ({
            notifications: state.notifications.filter(
              (notif) => notif._id !== notificationId
            ),
            loading: false,
          }));
          await get().refreshUnreadCount();
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Delete All Notifications
      deleteAllNotifications: async () => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.delete("/notifications/all");
          set({ notifications: [], loading: false });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Create Notification (Admin)
      createNotification: async (notificationData: Partial<Notification>) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.post<{
            success: boolean;
            notification: Notification;
          }>("/notifications", notificationData);
          const newNotification = data.notification;
          set((state) => ({
            notifications: [newNotification, ...state.notifications],
            loading: false,
          }));
          await get().refreshUnreadCount();
          return newNotification;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return undefined;
        }
      },

      // Send Bulk Notification
      sendBulkNotification: async (data) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.post("/notifications/bulk", data);
          set({ loading: false });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Fetch Preferences
      fetchPreferences: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            preferences: NotificationPreferences;
          }>("/notifications/preferences");
          set({ preferences: data.preferences, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Update Preferences
      updatePreferences: async (
        preferences: Partial<NotificationPreferences>
      ) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.put<{
            success: boolean;
            preferences: NotificationPreferences;
          }>("/notifications/preferences", preferences);
          set({ preferences: data.preferences, loading: false });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Fetch Stats
      fetchStats: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            stats: NotificationStats;
          }>("/notifications/stats");
          set({ stats: data.stats, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Get Unread Count
      getUnreadCount: () => {
        return get().unreadCount;
      },

      // Add Notification (Real-time)
      addNotification: (notification: Notification) => {
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: notification.read
            ? state.unreadCount
            : state.unreadCount + 1,
        }));
      },

      // Update Notification (Real-time)
      updateNotification: (
        notificationId: string,
        updates: Partial<Notification>
      ) => {
        set((state) => {
          const existing = state.notifications.find(
            (notif) => notif._id === notificationId
          );
          const updatedNotification = existing
            ? { ...existing, ...updates }
            : { _id: notificationId, ...updates } as Notification;
          const readAfterUpdate =
            updatedNotification.read ??
            existing?.read ??
            false;
          const wasUnread = existing ? !existing.read : false;
          const isUnread = !readAfterUpdate;
          const unreadDelta = (isUnread ? 1 : 0) - (wasUnread ? 1 : 0);

          return {
            notifications: state.notifications.map((notif) =>
              notif._id === notificationId ? updatedNotification : notif
            ),
            unreadCount: Math.max(0, state.unreadCount + unreadDelta),
          };
        });
      },

      removeNotification: (notificationId: string) => {
        set((state) => {
          const target = state.notifications.find(
            (notif) => notif._id === notificationId
          );
          const decrement = target && !target.read ? 1 : 0;
          return {
            notifications: state.notifications.filter(
              (notif) => notif._id !== notificationId
            ),
            unreadCount: Math.max(0, state.unreadCount - decrement),
          };
        });
      },

      markLocalAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((notif) => ({
            ...notif,
            read: true,
          })),
          unreadCount: 0,
        })),

      // UI Controls
      toggleHideReadNotifications: () => {
        set((state) => ({
          hideReadNotifications: !state.hideReadNotifications,
        }));
      },

      showAllNotifications: () => {
        set({ hideReadNotifications: false });
      },

      // Clear Error
      clearError: () => set({ error: undefined }),

      // Reset Store
      reset: () =>
        set({
          notifications: [],
          notification: undefined,
          preferences: undefined,
          stats: undefined,
          paginated: undefined,
          loading: false,
          error: undefined,
          unreadCount: 0,
        }),
    }),
    {
      name: "notification-store",
      partialize: (state) => ({
        preferences: state.preferences,
        hideReadNotifications: state.hideReadNotifications,
      }),
    }
  )
);
