import jwt from "jsonwebtoken";
import { getSiteMode } from "../modules/ops/index.js";
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
/*
  The paths that stay open while the shop is behind the splash.

  These have to cover POST as well as GET now — see the note on the method
  check below — so the auth endpoints are listed by the verb they are actually
  used with.
*/
const ALWAYS_ALLOW_PREFIXES = [
  "/api/site-mode",
  "/api/users/login",
  "/api/users/logout",
  "/api/users/me",
  "/api/users/refresh",
  "/api/users/profile",
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
    /*
      Every method, not only GET.

      This used to exempt POST/PUT/DELETE outright "so admins keep working",
      which let the whole shop through the gate to anyone who asked with the
      right verb: `POST /api/products/by-ids` is a public product read,
      `POST /api/support/ask` searches the catalogue through the assistant,
      and `POST /api/orders` places an order. So with the splash up and
      `blockPublicApi` on, a stranger could still browse and buy — the gate
      only ever stopped the storefront's own GETs.

      Admins keep working through the two things that were actually holding
      that exemption up: the allow-list above, and the admin-token and
      preview-key checks below, both of which run for every method.
    */
    if (req.method === "OPTIONS") return next();

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

    /*
      Admin cookie bypass.

      `allowAdminBypass` governs whether an administrator may *browse* the shop
      while the splash is up — that is what the toggle is for. It must not
      govern whether they can work: before the method check above was widened,
      every write passed unconditionally, so an operator with the toggle off
      could still run the dashboard. Keeping that true is the condition on
      which widening the gate is safe at all.

      So: a verified administrator always passes on a write, and on a read only
      when the toggle allows it.
    */
    const adminBypassApplies = req.method !== "GET" || mode.allowAdminBypass;
    if (adminBypassApplies && (await isAdminToken(req.cookies?.accessToken))) {
      return next();
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
