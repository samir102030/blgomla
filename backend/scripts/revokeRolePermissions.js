/**
 * Revoke permission keys from a role that has already been seeded.
 *
 * `seedRoles()` writes with `$setOnInsert`, so it only ever populates a role
 * document that doesn't exist yet. That is deliberate — it stops a deploy from
 * silently undoing whatever an admin has configured in Roles & Access — but it
 * also means editing `config/permissions.js` has no effect on any database
 * that has already run. Fresh installs get the new list; every existing one
 * keeps the old one until something changes it explicitly. This is that
 * something.
 *
 * Targeted on purpose. A blanket "sync roles to config" would be easier to
 * write and would quietly wipe custom roles and hand-tuned permissions, so
 * this only removes the keys you name, from the role you name, and reports
 * exactly what it did.
 *
 * Usage:
 *   node scripts/revokeRolePermissions.js store coupons.view coupons.create
 *   node scripts/revokeRolePermissions.js store "coupons.*"        # whole resource
 *   node scripts/revokeRolePermissions.js store coupons.view --dry-run
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Role from "../models/role.model.js";
import { invalidatePermissionCache } from "../utils/permissions.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const [roleKey, ...rawKeys] = args.filter((a) => a !== "--dry-run");
const keys = rawKeys.map((k) => k.trim()).filter(Boolean);

if (!roleKey || keys.length === 0) {
  console.error(
    "Usage: node scripts/revokeRolePermissions.js <roleKey> <permission...> [--dry-run]"
  );
  process.exit(1);
}

// "coupons.*" revokes every key under that resource, including the wildcard
// itself if the role happens to hold it.
const matches = (held, target) => {
  if (held === target) return true;
  if (target.endsWith(".*")) {
    const resource = target.slice(0, -2);
    return held === `${resource}.*` || held.startsWith(`${resource}.`);
  }
  return false;
};

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is not set — check backend/.env");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);

const role = await Role.findOne({ key: roleKey });
if (!role) {
  console.error(`No role found with key "${roleKey}"`);
  await mongoose.disconnect();
  process.exit(1);
}

const before = role.permissions || [];

// A role holding "*" would need that broken out into an explicit list before
// anything could be subtracted from it. Refuse rather than guess.
if (before.includes("*")) {
  console.error(
    `Role "${roleKey}" holds the "*" wildcard. Revoking a single key would mean\n` +
      `expanding it into an explicit list first — do that from Roles & Access,\n` +
      `where the consequences are visible.`
  );
  await mongoose.disconnect();
  process.exit(1);
}

const removed = before.filter((held) => keys.some((k) => matches(held, k)));
const after = before.filter((held) => !removed.includes(held));

if (removed.length === 0) {
  console.log(`Role "${roleKey}" holds none of: ${keys.join(", ")} — nothing to do.`);
  await mongoose.disconnect();
  process.exit(0);
}

console.log(`Role "${roleKey}"`);
console.log(`  removing : ${removed.join(", ")}`);
console.log(`  before   : ${before.length} permissions`);
console.log(`  after    : ${after.length} permissions`);

if (dryRun) {
  console.log("\n--dry-run — nothing written.");
} else {
  role.permissions = after;
  await role.save();
  invalidatePermissionCache();
  console.log("\nSaved. Sessions pick this up within the 60s permission cache TTL.");
}

await mongoose.disconnect();
