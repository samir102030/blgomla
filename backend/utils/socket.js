import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://*.netlify.app",
  "https://68935717a16f60000867bbf9--belgomla.netlify.app",
  "https://*.ngrok-free.app",
];

let io;

const normalizeWildcard = (value) =>
  value
    .replace(/\./g, "\\.")
    .replace(/\*/g, ".*")
    .replace(/\//g, "\\/");

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  return CLIENT_ORIGINS.some((allowed) => {
    if (allowed.includes("*")) {
      const regex = new RegExp(`^${normalizeWildcard(allowed)}$`);
      return regex.test(origin);
    }
    return allowed === origin;
  });
};

const parseCookies = (cookieHeader = "") => {
  return cookieHeader.split(";").reduce((cookies, cookiePair) => {
    const [rawName, ...rest] = cookiePair.split("=");
    if (!rawName) return cookies;
    const name = rawName.trim();
    const value = rest.join("=").trim();
    if (name) {
      cookies[name] = decodeURIComponent(value);
    }
    return cookies;
  }, {});
};

export const initializeSocket = (server) => {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        callback(null, isOriginAllowed(origin));
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const accessToken = cookies.accessToken;

      if (!accessToken) {
        return next(new Error("Missing access token"));
      }

      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user || !user.active || user.deleted) {
        return next(new Error("Unauthorized"));
      }

      socket.data.userId = user._id.toString();
      socket.join(user._id.toString());
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {});
  });

  return io;
};

const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(userId.toString()).emit(event, payload);
};

export const emitNotificationCreated = (userId, notification) => {
  emitToUser(userId, "notification:new", notification);
};

export const emitNotificationUpdated = (userId, notification) => {
  emitToUser(userId, "notification:updated", notification);
};

export const emitNotificationDeleted = (userId, notificationId) => {
  emitToUser(userId, "notification:deleted", { notificationId });
};

export const emitNotificationMarkAllRead = (userId) => {
  emitToUser(userId, "notification:markAllRead", { userId });
};
