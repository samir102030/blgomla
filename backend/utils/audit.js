import { AuditLog } from "../modules/ops/index.js";

// Retention by category. Categories not listed (security/account/admin) are
// kept indefinitely (no expiresAt). High-volume low-value categories expire.
const RETENTION_DAYS = { customer: 90, system: 30 };

const toParty = (u) =>
  u
    ? {
        userId: u._id || u.userId,
        name: u.name,
        email: u.email,
        role: u.role,
      }
    : undefined;

/**
 * Fire-and-forget audit log entry. Never throws — a logging failure must never
 * block the actual operation.
 *
 * @param {import('express').Request} req
 * @param {string} action    e.g. "user.role_changed"
 * @param {string} resource  e.g. "user"
 * @param {*} resourceId     Mongoose ObjectId or string
 * @param {object} [meta]    Extra context (reason, note, counts, …)
 * @param {object} [opts]
 * @param {object} [opts.actor]     Explicit actor (when req.user isn't set yet, e.g. login)
 * @param {object} [opts.target]    The user/entity the action was performed on
 * @param {"success"|"failure"} [opts.status]
 * @param {"info"|"warning"|"critical"} [opts.severity]
 * @param {Array<{field:string,from:*,to:*}>} [opts.changes]
 * @param {string} [opts.category]  "security"|"account"|"admin"|"customer"|"system"
 */
export function logAudit(req, action, resource, resourceId, meta = {}, opts = {}) {
  const category = opts.category || "admin";
  const ttl = RETENTION_DAYS[category];
  AuditLog.create({
    actor: toParty(opts.actor || req?.user) || {},
    target: toParty(opts.target),
    action,
    resource,
    resourceId: resourceId ?? undefined,
    status: opts.status || "success",
    severity: opts.severity || "info",
    category,
    changes: opts.changes && opts.changes.length ? opts.changes : undefined,
    meta,
    method: req?.method,
    path: req?.originalUrl || req?.url,
    ip:
      req?.ip ||
      (req?.headers?.["x-forwarded-for"] || "").split(",")[0].trim() ||
      undefined,
    userAgent: req?.headers?.["user-agent"],
    expiresAt: ttl ? new Date(Date.now() + ttl * 86400_000) : undefined,
  }).catch(() => {});
}

/**
 * Build a field-level diff for "before/after" audit entries.
 * @returns {Array<{field:string,from:*,to:*}>}
 */
export function diff(before = {}, after = {}, fields) {
  const keys =
    fields ||
    Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));
  const changes = [];
  for (const f of keys) {
    const a = before?.[f];
    const b = after?.[f];
    if (JSON.stringify(a) !== JSON.stringify(b)) changes.push({ field: f, from: a, to: b });
  }
  return changes;
}
