import jwt from "jsonwebtoken";
import { getSiteMode } from "../models/siteMode.model.js";
import User from "../models/user.model.js";

// Tiny in-process cache so this middleware doesn't run a Mongo query on every
// request. Vercel's lambda model means each cold instance re-fetches once.
let cache = { mode: null, ts: 0 };
const TTL_MS = 30_000;

const loadMode = async () => {
  if (cache.mode && Date.now() - cache.ts < TTL_MS) return cache.mode;
  const mode = await getSiteMode();
  cache = { mode, ts: Date.now() };
  return mode;
};

// Allow consumers (e.g. the admin update endpoint) to bust the cache after
// flipping the toggle so the new state is reflected immediately.
export const bustComingSoonCache = () => {
  cache = { mode: null, ts: 0 };
};

// Paths that must never be gated, regardless of mode — admins need the
// dashboard, auth, and the site-mode endpoint itself to be able to flip it.
const ALWAYS_ALLOW_PREFIXES = [
  "/api/site-mode",
  "/api/users/login",
  "/api/users/logout",
  "/api/users/me",
  "/api/_ping",
  "/api/v1/health",
  "/api/cron",
];

const isAdminToken = async (accessToken) => {
  if (!accessToken) return false;
  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("role");
    return user && ["admin", "super_admin"].includes(user.role);
  } catch {
    return false;
  }
};

export const comingSoonGate = async (req, res, next) => {
  try {
    // Only consider gating API GETs — POST/PUT/DELETE flow through normally
    // so admins keep working. Frontend has its own splash gate for the UI.
    if (req.method !== "GET") return next();

    const mode = await loadMode();
    if (!mode?.comingSoon || !mode?.blockPublicApi) return next();

    if (ALWAYS_ALLOW_PREFIXES.some((p) => req.path.startsWith(p))) {
      return next();
    }

    // Preview key bypass via ?previewKey=... or X-Preview-Key header.
    const provided =
      req.query?.previewKey || req.headers["x-preview-key"] || "";
    if (mode.previewKey && provided && provided === mode.previewKey) {
      return next();
    }

    // Admin cookie bypass.
    if (mode.allowAdminBypass) {
      const ok = await isAdminToken(req.cookies?.accessToken);
      if (ok) return next();
    }

    res.setHeader("Retry-After", "3600");
    return res.status(503).json({
      success: false,
      comingSoon: true,
      message: "Site is in coming-soon mode. Please check back soon.",
    });
  } catch (err) {
    // Fail open — never let the gate take the API down.
    console.error("comingSoonGate error:", err.message);
    return next();
  }
};
