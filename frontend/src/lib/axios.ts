import axios from "axios";
import { useUserStore } from "../stores/user.store";
import i18n from "./i18n";

export const axiosInstance = axios.create({
  // baseURL: "http://localhost:5000/api/",
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor to add language header
axiosInstance.interceptors.request.use(
  (config) => {
    // Get current language from i18n
    const currentLanguage = i18n.language || "en";

    // Add Accept-Language header
    config.headers["Accept-Language"] = currentLanguage;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If refresh is already in progress, queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        await axiosInstance.post("/users/refresh");

        // If refresh succeeds, retry all queued requests
        processQueue(null);

        // Retry the original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // If refresh fails, logout the user
        processQueue(refreshError, null);

        const userStore = useUserStore.getState();
        await userStore.logout();

        // Redirect to login page or show message
        window.location.href = "/login";

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
