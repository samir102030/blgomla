import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import connectDB from "./config/db.js";
import systemRoutes from "./routes/system.route.js";
import { CLIENT_ORIGINS } from "./utils/socket.js";
import { trackVisitor } from "./middleware/analytics.middleware.js";
import { comingSoonGate } from "./middleware/comingSoon.middleware.js";
import { captureException } from "./utils/sentry.js";

dotenv.config();

let dbConnectionPromise;
const ensureDB = () => {
  if (!dbConnectionPromise) dbConnectionPromise = connectDB();
  return dbConnectionPromise;
};

// Kick off the DB connection at module load so /api/v1/health reports
// "connected" without needing a prior request to warm it up. Errors are
// caught to avoid an unhandled rejection — the ensureDB middleware will
// surface them on the next request.
ensureDB().catch((err) => console.error("Initial DB connect failed:", err.message));

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

const extraOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  ...extraOrigins,
  ...CLIENT_ORIGINS,
  "https://*.vercel.app",
].filter(Boolean);

const isOriginAllowed = (origin) => {
  return allowedOrigins.some((allowed) => {
    if (allowed.includes("*")) {
      const regex = new RegExp(
        "^" + allowed.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$",
      );
      return regex.test(origin);
    }
    return allowed === origin;
  });
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Lightweight ping for keep-warm cron — runs BEFORE the DB middleware so
// it returns instantly without forcing a Mongo connection.
app.get("/api/_ping", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// Health endpoint — DB-aware, suitable for uptime monitors.
// Returns 503 if Mongo isn't connected so a monitor can page on it.
app.get("/api/v1/health", async (req, res) => {
  // mongoose imported lazily so this still works before connectDB resolves
  const { default: mongoose } = await import("mongoose");
  const dbState = mongoose.connection.readyState; // 0 disconnected, 1 connected
  const ok = dbState === 1;
  res.status(ok ? 200 : 503).json({
    ok,
    service: "halafawyStore-backend",
    uptime: Math.round(process.uptime()),
    db: ["disconnected", "connected", "connecting", "disconnecting"][dbState] ?? "unknown",
    ts: new Date().toISOString(),
  });
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use(comingSoonGate);

app.use(trackVisitor);

// Cache-Control for public, read-only GETs that change rarely.
// Browser keeps for 60s; Vercel CDN keeps for 5 min and serves stale up to
// 1h while it revalidates in the background. Anonymous GETs only — anything
// authenticated (cookies present) bypasses the cache.
const cacheablePrefixes = [
  "/api/home-feed",
  "/api/products",
  "/api/brands",
  "/api/categories",
  "/api/collections",
  "/api/advertisements",
  "/api/social-proof",
  "/api/coupons/public",
  "/api/mosaic-cards/active",
];
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  const isCacheable = cacheablePrefixes.some((p) => req.path.startsWith(p));
  if (!isCacheable) return next();
  // Skip cache for authenticated requests (they may see admin/vendor data)
  if (req.headers.cookie && req.headers.cookie.includes("accessToken")) return next();
  res.setHeader(
    "Cache-Control",
    "public, max-age=60, s-maxage=300, stale-while-revalidate=3600"
  );
  next();
});

app.use("/api", systemRoutes);

app.get("/", (req, res) => {
  res.json({ ok: true, service: "halafawyStore-backend" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  if (!err.status || err.status >= 500) {
    captureException(err, { path: req.originalUrl, method: req.method });
  }
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

export default app;
