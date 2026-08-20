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
import { MongoRateLimitStore } from "./utils/rateLimitStore.js";

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

// Vercel puts the function behind its edge proxy, so req.ip is the proxy's
// address unless we trust one hop. Without this every visitor shares a single
// rate-limit bucket — 10 failed logins from anyone would lock out the whole
// site via the auth limiter. `1` (not `true`) because express-rate-limit
// rejects a fully permissive setting, which would let clients spoof
// X-Forwarded-For and bypass the limiter entirely.
app.set("trust proxy", 1);

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

// The old entry here was `https://*.vercel.app`, which matches every
// deployment on Vercel — not just ours. Combined with credentials: true, any
// person who deployed anything to Vercel could make authenticated
// cross-origin calls with a logged-in customer's cookies.
//
// Preview deploys still need a wildcard, so scope it to this project's
// prefix: that covers production (blgomla.vercel.app) and every preview
// (blgomla-<hash>-<team>.vercel.app) without admitting strangers. Override
// with VERCEL_PROJECT_PREFIX if the project is ever renamed.
const vercelProjectPrefix = process.env.VERCEL_PROJECT_PREFIX || "blgomla";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  // Live storefront. Listed explicitly rather than relying solely on
  // CLIENT_URL so a missing env var can't take the site down.
  "https://belgmla.com",
  "https://www.belgmla.com",
  ...extraOrigins,
  ...CLIENT_ORIGINS,
  `https://${vercelProjectPrefix}*.vercel.app`,
].filter(Boolean);

const isOriginAllowed = (origin) => {
  return allowedOrigins.some((allowed) => {
    if (allowed.includes("*")) {
      // `[^.]*` keeps the wildcard inside a single DNS label, so
      // `https://evil.attacker.com.vercel.app` can't slip through a pattern
      // that was only meant to match one more level of subdomain.
      const regex = new RegExp(
        "^" + allowed.replace(/\./g, "\\.").replace(/\*/g, "[^.]*") + "$",
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
    service: "blgomla-api",
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
  // Shared across instances — the default memory store gives every warm
  // Lambda its own counter, which makes the limit meaningless on Vercel.
  store: new MongoRateLimitStore({ prefix: "rl:global" }),
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
  // The shape of the shop is edited by hand and the person editing it expects
  // to see the result. Categories and brands are what the menu is built from,
  // and five minutes of edge cache means an operator reorders the menu, looks
  // at the site, and finds their change missing with nothing to tell them why.
  // Thirty seconds is short enough to feel immediate and long enough to still
  // absorb the traffic these two endpoints get.
  const editorial = req.path.startsWith("/api/categories") || req.path.startsWith("/api/brands");
  res.setHeader(
    "Cache-Control",
    editorial
      ? "public, max-age=0, s-maxage=30, stale-while-revalidate=300"
      : "public, max-age=60, s-maxage=300, stale-while-revalidate=3600"
  );
  next();
});

app.use("/api", systemRoutes);

app.get("/", (req, res) => {
  res.json({ ok: true, service: "blgomla-api" });
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
