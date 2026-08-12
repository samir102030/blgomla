import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Scoped to this project's own deploys. The previous `https://*.netlify.app`
// entry admitted every site hosted on Netlify — and this list is also what
// app.js trusts for credentialed CORS, so it was an open door for anyone with
// a free Netlify account. `*--belgomla.netlify.app` still covers Netlify
// deploy previews, which is what the wildcard was there for.
//
// The ngrok wildcard is a local-tunnel convenience, never trusted in prod.
// Checks NODE_ENV as well as VERCEL_ENV so this still holds when the app is
// hosted somewhere other than Vercel, where VERCEL_ENV simply doesn't exist.
const isProductionDeploy =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";

export const CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://belgomla.netlify.app",
  "https://*--belgomla.netlify.app",
  ...(isProductionDeploy ? [] : ["https://*.ngrok-free.app"]),
];

let io;

// `[^.]*` rather than `.*` so a wildcard only ever spans one DNS label.
const normalizeWildcard = (value) =>
  value
    .replace(/\./g, "\\.")
    .replace(/\*/g, "[^.]*")
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
