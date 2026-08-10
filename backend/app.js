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

// Cache the bootstrap promise (DB connect + role seed) so consecutive
// requests on the same warm Lambda share the same handshake. Reset on
// failure so a single transient hiccup doesn't pin a rejected promise
// for the rest of the container's lifetime.
let dbBootstrapPromise = null;
const ensureDB = () => {
  if (dbBootstrapPromise) return dbBootstrapPromise;
  dbBootstrapPromise = connectDB()
    .then(async () => {
      const { seedRoles } = await import("./models/role.model.js");
      await seedRoles();
    })
    .catch((err) => {
      // Allow the next request to retry the handshake.
      dbBootstrapPromise = null;
      throw err;
    });
  return dbBootstrapPromise;
};

// Kick off the DB connection at module load so /api/v1/health can report
// "connected" without a request first. The .catch keeps the unhandled
// rejection at bay; ensureDB() itself already resets on failure so the
// next request will retry from scratch.
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
    // Which commit is actually serving. Vercel injects these at build time.
    // Without it there is no way to tell a successful deploy from a failed one
    // that left the previous build running — the symptom that cost us an
    // afternoon of chasing a "deployed" fix that was never live.
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || "unknown").slice(0, 7),
    env: process.env.VERCEL_ENV || "local",
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
    // DB is genuinely unavailable — distinguish 503 from a generic 500
    // so monitors page on it and clients can present a retry UI.
    err.status = 503;
    err.message = "Database temporarily unavailable. Please retry shortly.";
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
