import AuditLog from "../models/auditLog.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { paginateQuery } from "../utils/pagination.js";

export const getAuditLogs = controllerWrapper("getAuditLogs", async (req, res) => {
  const {
    page = 1,
    limit = 50,
    action,
    resource,
    actorId,
    from,
    to,
  } = req.query;

  const filter = {};
  if (action) filter.action = { $regex: action, $options: "i" };
  if (resource) filter.resource = resource;
  if (actorId) filter["actor.userId"] = actorId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const query = AuditLog.find(filter).sort({ createdAt: -1 });
  const result = await paginateQuery(page, limit, query);
  res.json(result);
});
