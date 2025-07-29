import { create } from 'zustand';
// import axios from 'axios';
import { axiosInstance } from '../lib/axios';

export interface Notification {
  _id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

interface NotificationStore {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  showAll: boolean;
  setShowAll: (show: boolean) => void;
  fetchAllNotifications: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  loading: false,
  error: null,
  showAll: false,
  setShowAll: (show: boolean) => set({ showAll: show }),
  fetchAllNotifications: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axiosInstance.get('/notifications/all');
      set({ notifications: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch all notifications', loading: false });
    }
  },
  fetchNotifications: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axiosInstance.get('/notifications');
      set({ notifications: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch notifications', loading: false });
    }
  },
  markAsRead: async (id: string) => {
    try {
      await axiosInstance.put(`/notifications/${id}/read`);
      set({
        notifications: get().notifications.map(n =>
          n._id === id ? { ...n, read: true } : n
        ),
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to mark as read' });
    }
  },
  markAllAsRead: async () => {
    try {
      await axiosInstance.put('/notifications/mark-all-read');
      set({
        notifications: get().notifications.map(n => ({ ...n, read: true })),
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to mark all as read' });
    }
  },
  deleteNotification: async (id: string) => {
    try {
      await axiosInstance.delete(`/notifications/${id}`);
      set({
        notifications: get().notifications.filter(n => n._id !== id),
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete notification' });
    }
  },
})); 