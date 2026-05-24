import { AuditLog } from "../modules/ops/index.js";

/**
 * Fire-and-forget audit log entry. Never throws — a logging failure
 * must never block the actual operation.
 *
 * @param {import('express').Request} req
 * @param {string} action  e.g. "order.status_changed"
 * @param {string} resource  e.g. "order"
 * @param {*} resourceId  Mongoose ObjectId or string
 * @param {object} [meta]  Extra context (before/after values, reason, etc.)
 */
export function logAudit(req, action, resource, resourceId, meta = {}) {
  const user = req?.user;
  AuditLog.create({
    actor: user
      ? { userId: user._id, name: user.name, email: user.email, role: user.role }
      : {},
    action,
    resource,
    resourceId: resourceId ?? undefined,
    meta,
    ip: req?.ip || req?.headers?.["x-forwarded-for"],
  }).catch(() => {});
}
