import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useUserStore } from "../stores/user.store";
import { useNotificationStore } from "../stores/notification.store";
import type { Notification } from "../types/notification.type";

const getSocketBaseUrl = () => {
  const socketUrl = import.meta.env.VITE_SOCKET_URL;
  if (socketUrl) {
    return socketUrl.replace(/\/+$/, "");
  }
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return apiUrl.replace(/\/api\/?$/, "");
};

const useNotificationSocket = () => {
  const user = useUserStore((state) => state.user);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const updateNotification = useNotificationStore(
    (state) => state.updateNotification
  );
  const removeNotification = useNotificationStore(
    (state) => state.removeNotification
  );
  const markLocalAllRead = useNotificationStore(
    (state) => state.markLocalAllRead
  );
  const refreshUnreadCount = useNotificationStore(
    (state) => state.refreshUnreadCount
  );

  const addNotificationRef = useRef(addNotification);
  const updateNotificationRef = useRef(updateNotification);
  const removeNotificationRef = useRef(removeNotification);
  const markLocalAllReadRef = useRef(markLocalAllRead);
  const refreshUnreadCountRef = useRef(refreshUnreadCount);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);

  useEffect(() => {
    updateNotificationRef.current = updateNotification;
  }, [updateNotification]);

  useEffect(() => {
    removeNotificationRef.current = removeNotification;
  }, [removeNotification]);

  useEffect(() => {
    markLocalAllReadRef.current = markLocalAllRead;
  }, [markLocalAllRead]);

  useEffect(() => {
    refreshUnreadCountRef.current = refreshUnreadCount;
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (socketRef.current) {
      return;
    }

    const baseUrl = getSocketBaseUrl();
    if (!baseUrl) {
      return;
    }

    const socket = io(baseUrl, {
      withCredentials: true,
      autoConnect: true,
    });

    const handleNewNotification = (notification: Notification) => {
      addNotificationRef.current(notification);
    };

    const handleNotificationUpdate = (notification: Notification) => {
      updateNotificationRef.current(notification._id, notification);
    };

    const handleNotificationDelete = (payload: { notificationId: string }) => {
      removeNotificationRef.current(payload.notificationId);
      refreshUnreadCountRef.current();
    };

    const handleMarkAllRead = () => {
      markLocalAllReadRef.current();
      refreshUnreadCountRef.current();
    };

    socket.on("connect", () => {
      refreshUnreadCountRef.current();
    });

    socket.on("connect_error", (error) => {
      console.error("Notification socket error:", error);
    });

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:updated", handleNotificationUpdate);
    socket.on("notification:deleted", handleNotificationDelete);
    socket.on("notification:markAllRead", handleMarkAllRead);

    socketRef.current = socket;

    return () => {
      socket.off("connect_error");
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:updated", handleNotificationUpdate);
      socket.off("notification:deleted", handleNotificationDelete);
      socket.off("notification:markAllRead", handleMarkAllRead);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);
};

export default useNotificationSocket;
