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

    /**
     * The JSON content type above is right for almost every request and wrong
     * for the ones carrying a file.
     *
     * axios 1.x reads that header before sending: seeing JSON with a FormData
     * body, it runs the body through `formDataToJSON`, and a File serialises
     * to `{}`. The server receives `{"file":{}}`, multer finds nothing, and
     * the answer is "No file uploaded" — for a file the user definitely
     * chose. Every upload that works in this app works because its call site
     * remembered to override the header; the ones that forgot were broken and
     * looked like a server fault.
     *
     * Dropping the header here lets the browser set `multipart/form-data`
     * with the boundary that makes the body parseable, so an upload works
     * whether or not its call site remembered.
     */
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      const headers = config.headers as any;
      if (typeof headers?.delete === "function") headers.delete("Content-Type");
      else delete headers["Content-Type"];
    }

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

// A 401 from these endpoints means "these credentials are wrong", not "your
// session expired" — there is nothing to refresh. Retrying them kicked the
// user out mid-login: the 2FA flow answers the first POST /users/login with
// 401 + code:"TOTP_REQUIRED" so the UI can prompt for the 6-digit code, and
// the interceptor was treating that as a dead session, calling logout() and
// hard-redirecting to /login before the code could ever be entered.
const NO_REFRESH_PATHS = [
  "/users/login",
  "/users/google",
  "/users/signup",
  "/users/refresh",
  "/users/verifyEmail",
  "/users/forgotPassword",
  "/users/resetPassword",
];

const shouldAttemptRefresh = (error: any) => {
  if (error.response?.status !== 401) return false;
  if (error.response?.data?.code === "TOTP_REQUIRED") return false;

  /*
    Nobody is signed in, so there is no session to refresh and nothing has
    expired. A signed-out visitor draws a 401 from anything protected the page
    happens to touch — the profile call, the unread-notification count, the
    cart — and the branch below answers a failed refresh by logging out and
    hard-redirecting to /login. That threw shoppers off public pages: opening
    a product while signed out landed on the login form.

    A 401 only means "your session ended" if there was a session.
  */
  if (!useUserStore.getState().user) return false;

  const url: string = error.config?.url || "";
  return !NO_REFRESH_PATHS.some((path) => url.startsWith(path));
};

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (shouldAttemptRefresh(error) && !originalRequest._retry) {
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
