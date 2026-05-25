import mongoose from "mongoose";
import { SYSTEM_ROLES } from "../config/permissions.js";

const roleSchema = new mongoose.Schema(
  {
    // Stable identifier referenced by User.role.
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    // System roles cannot be deleted; super_admin cannot be edited.
    isSystem: { type: Boolean, default: false },
    // Flat list of permission keys ("resource.action"), or wildcards "*" / "resource.*".
    permissions: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Role = mongoose.model("Role", roleSchema);

/**
 * Idempotently create the built-in roles. Uses $setOnInsert so an admin's
 * later customizations to a system role's permissions are never overwritten.
 */
export const seedRoles = async () => {
  try {
    await Promise.all(
      SYSTEM_ROLES.map((r) =>
        Role.updateOne(
          { key: r.key },
          {
            $setOnInsert: {
              key: r.key,
              name: r.name,
              description: r.description,
              isSystem: true,
              permissions: r.permissions,
            },
          },
          { upsert: true }
        )
      )
    );
  } catch (err) {
    console.error("seedRoles failed:", err.message);
  }
};

export default Role;
