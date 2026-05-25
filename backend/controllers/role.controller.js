import Role from "../models/role.model.js";
import User from "../models/user.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { invalidatePermissionCache } from "../utils/permissions.js";
import {
  PERMISSION_GROUPS,
  ALL_PERMISSION_KEYS,
} from "../config/permissions.js";
import { logAudit } from "../utils/audit.js";

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

// Keep only valid permission keys plus wildcards ("*", "resource.*").
const KNOWN_RESOURCES = new Set(PERMISSION_GROUPS.map((g) => g.resource));
const sanitizePermissions = (perms) => {
  if (!Array.isArray(perms)) return [];
  const out = new Set();
  for (const p of perms) {
    if (typeof p !== "string") continue;
    if (p === "*") out.add("*");
    else if (ALL_PERMISSION_KEYS.includes(p)) out.add(p);
    else if (/^[a-z]+\.\*$/.test(p) && KNOWN_RESOURCES.has(p.split(".")[0])) out.add(p);
  }
  return [...out];
};

// GET /api/roles/permissions — the registry the matrix UI renders from.
export const getPermissionRegistry = controllerWrapper(
  "getPermissionRegistry",
  async (_req, res) => {
    res.json({ success: true, groups: PERMISSION_GROUPS });
  }
);

// GET /api/roles — all roles with a user count.
export const getRoles = controllerWrapper("getRoles", async (_req, res) => {
  const roles = await Role.find({}).sort({ isSystem: -1, name: 1 }).lean();
  const counts = await User.aggregate([
    { $match: { deleted: { $ne: true } } },
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id, c.count]));
  res.json({
    success: true,
    roles: roles.map((r) => ({ ...r, userCount: countMap.get(r.key) || 0 })),
  });
});

// POST /api/roles — create a custom role.
export const createRole = controllerWrapper("createRole", async (req, res) => {
  const { name, description = "", permissions = [] } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: "Name is required" });
  }
  const key = slugify(name);
  if (!key) {
    return res.status(400).json({ success: false, message: "Invalid role name" });
  }
  if (await Role.exists({ key })) {
    return res
      .status(409)
      .json({ success: false, message: "A role with this name already exists" });
  }
  const role = await Role.create({
    key,
    name: name.trim(),
    description,
    isSystem: false,
    permissions: sanitizePermissions(permissions),
  });
  invalidatePermissionCache();
  logAudit(req, "role.created", "role", role._id, { key: role.key, name: role.name }, {
    severity: "critical",
    category: "security",
  });
  res.status(201).json({ success: true, role });
});

// PUT /api/roles/:key — update name/description/permissions.
export const updateRole = controllerWrapper("updateRole", async (req, res) => {
  const { key } = req.params;
  const role = await Role.findOne({ key });
  if (!role) {
    return res.status(404).json({ success: false, message: "Role not found" });
  }
  // super_admin is the unrestricted safety net — never editable.
  if (role.key === "super_admin") {
    return res
      .status(403)
      .json({ success: false, message: "The super admin role cannot be modified" });
  }

  const { name, description, permissions } = req.body;
  const before = [...role.permissions];

  if (typeof name === "string" && name.trim() && !role.isSystem) role.name = name.trim();
  if (typeof description === "string") role.description = description;
  if (Array.isArray(permissions)) role.permissions = sanitizePermissions(permissions);

  await role.save();
  invalidatePermissionCache();
  logAudit(req, "role.updated", "role", role._id, { key: role.key }, {
    changes: [{ field: "permissions", from: before, to: role.permissions }],
    severity: "critical",
    category: "security",
  });
  res.json({ success: true, role });
});

// DELETE /api/roles/:key — remove a custom role (blocked if in use).
export const deleteRole = controllerWrapper("deleteRole", async (req, res) => {
  const { key } = req.params;
  const role = await Role.findOne({ key });
  if (!role) {
    return res.status(404).json({ success: false, message: "Role not found" });
  }
  if (role.isSystem) {
    return res
      .status(403)
      .json({ success: false, message: "Built-in roles cannot be deleted" });
  }
  const inUse = await User.countDocuments({ role: key, deleted: { $ne: true } });
  if (inUse > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete: ${inUse} user(s) still have this role. Reassign them first.`,
    });
  }
  await role.deleteOne();
  invalidatePermissionCache();
  logAudit(req, "role.deleted", "role", role._id, { key: role.key, name: role.name }, {
    severity: "critical",
    category: "security",
  });
  res.json({ success: true, message: "Role deleted" });
});
