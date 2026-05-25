import Role from "../models/role.model.js";
import { SYSTEM_ROLES } from "../config/permissions.js";

// Fail-safe: built-in roles always resolve from static config even if the DB
// seed is missing/failed, so an admin/super_admin can never be locked out.
const STATIC_FALLBACK = new Map(SYSTEM_ROLES.map((r) => [r.key, r.permissions]));

// In-memory role→permissions cache. Refreshed on a short TTL and explicitly
// invalidated after role edits. Per serverless instance; stale by ≤ TTL.
let cache = { map: null, at: 0 };
const TTL_MS = 60_000;

const loadRoleMap = async () => {
  const roles = await Role.find({}).select("key permissions").lean();
  const map = new Map(roles.map((r) => [r.key, r.permissions || []]));
  // Don't cache an empty result (e.g. before seeding) — retry next call.
  cache = { map, at: roles.length ? Date.now() : 0 };
  return map;
};

const getRoleMap = async () => {
  if (cache.map && Date.now() - cache.at < TTL_MS) return cache.map;
  return loadRoleMap();
};

export const invalidatePermissionCache = () => {
  cache = { map: null, at: 0 };
};

/** Resolve the flat permission list for a user's role. */
export const getUserPermissions = async (user) => {
  if (!user?.role) return [];
  const map = await getRoleMap();
  // DB role wins (honors admin edits); fall back to static built-ins so a
  // missing/failed seed can never strip a built-in role of its access.
  return map.get(user.role) || STATIC_FALLBACK.get(user.role) || [];
};

/** Does a permission list satisfy a required key? Honors "*" and "resource.*". */
export const permsAllow = (perms, key) => {
  if (!perms || !perms.length) return false;
  if (perms.includes("*")) return true;
  if (perms.includes(key)) return true;
  const resource = key.split(".")[0];
  return perms.includes(`${resource}.*`);
};

export const userCan = async (user, key) => {
  if (!user) return false;
  return permsAllow(await getUserPermissions(user), key);
};
