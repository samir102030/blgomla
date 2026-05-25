import AuditLog from "./auditLog.model.js";
import { controllerWrapper } from "../../utils/wrappers.js";
import { paginateQuery } from "../../utils/pagination.js";

// Escape user input before using it inside a RegExp (avoids regex injection).
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const CSV_COLS = [
  "createdAt",
  "action",
  "resource",
  "status",
  "severity",
  "category",
  "actor.name",
  "actor.email",
  "actor.role",
  "target.name",
  "target.email",
  "ip",
  "userAgent",
  "changes",
  "meta",
];
const getPath = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);
const csvCell = (v) => {
  if (v == null) return "";
  let s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
};
const toCsv = (rows) =>
  [
    CSV_COLS.join(","),
    ...rows.map((r) => CSV_COLS.map((c) => csvCell(getPath(r, c))).join(",")),
  ].join("\n");

export const getAuditLogs = controllerWrapper("getAuditLogs", async (req, res) => {
  const {
    page = 1,
    limit = 50,
    action,
    resource,
    actorId,
    targetId,
    userId, // matches actor OR target — used for a single user's activity trail
    status,
    severity,
    category,
    method,
    q, // free-text across action / actor / target / ip
    from,
    to,
    format,
  } = req.query;

  const and = [];
  if (action) and.push({ action: { $regex: esc(action), $options: "i" } });
  if (resource) and.push({ resource });
  if (status) and.push({ status });
  if (severity) and.push({ severity });
  if (category) and.push({ category });
  if (method) and.push({ method: String(method).toUpperCase() });
  if (actorId) and.push({ "actor.userId": actorId });
  if (targetId) and.push({ "target.userId": targetId });
  if (userId)
    and.push({ $or: [{ "actor.userId": userId }, { "target.userId": userId }] });
  if (q) {
    const rx = { $regex: esc(q), $options: "i" };
    and.push({
      $or: [
        { action: rx },
        { "actor.name": rx },
        { "actor.email": rx },
        { "target.name": rx },
        { "target.email": rx },
        { ip: rx },
      ],
    });
  }
  if (from || to) {
    const createdAt = {};
    if (from) createdAt.$gte = new Date(from);
    if (to) createdAt.$lte = new Date(to);
    and.push({ createdAt });
  }
  const filter = and.length ? { $and: and } : {};

  if (format === "csv") {
    const rows = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.send(toCsv(rows));
  }

  const query = AuditLog.find(filter).sort({ createdAt: -1 });
  const result = await paginateQuery(page, limit, query);
  res.json(result);
});
