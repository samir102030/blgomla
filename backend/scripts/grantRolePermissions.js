/**
 * Add permissions to a role that already exists in the database.
 *
 * `seedRoles()` writes with `$setOnInsert`, deliberately: it must never
 * overwrite an administrator's customisations to a system role. The cost is
 * that a permission added to config/permissions.js after a database was seeded
 * never reaches the role documents already in it. The code says vendors can
 * see the fitting queue; the database, seeded earlier, says they cannot — and
 * the database wins.
 *
 * This closes that gap by adding — never removing, never replacing — so a
 * role's existing grants are untouched. The mirror of
 * scripts/revokeRolePermissions.js.
 *
 *   node scripts/grantRolePermissions.js store installations.view installations.manage
 *   node scripts/grantRolePermissions.js --sync            # every system role
 *   node scripts/grantRolePermissions.js --sync --dry-run
 */
import "dotenv/config";
import mongoose from "mongoose";
import Role, { } from "../models/role.model.js";
import { SYSTEM_ROLES, ALL_PERMISSION_KEYS } from "../config/permissions.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const sync = args.includes("--sync");
const positional = args.filter((a) => !a.startsWith("--"));

const die = (msg) => {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
};

if (!sync && positional.length < 2) {
  die(
    "Usage:\n" +
      "    node scripts/grantRolePermissions.js <roleKey> <perm> [perm...]\n" +
      "    node scripts/grantRolePermissions.js --sync [--dry-run]"
  );
}

const uri = process.env.MONGO_URI;
if (!uri) die("MONGO_URI is not set.");

await mongoose.connect(uri);
console.log(`\n  Connected to ${mongoose.connection.name}${dryRun ? "  (dry run)" : ""}\n`);

/** Add `perms` to one role, reporting exactly what changed. */
const grant = async (roleKey, perms) => {
  const role = await Role.findOne({ key: roleKey });
  if (!role) {
    console.log(`  ${roleKey.padEnd(14)} — no such role, skipped`);
    return;
  }

  // A role holding the wildcard already has everything; adding named keys
  // would only make its list longer and no more powerful.
  if (role.permissions.includes("*")) {
    console.log(`  ${roleKey.padEnd(14)} — holds "*", nothing to add`);
    return;
  }

  const unknown = perms.filter((p) => !ALL_PERMISSION_KEYS.includes(p));
  if (unknown.length) {
    die(`Unknown permission(s): ${unknown.join(", ")}`);
  }

  const missing = perms.filter((p) => !role.permissions.includes(p));
  if (missing.length === 0) {
    console.log(`  ${roleKey.padEnd(14)} — already has all of them`);
    return;
  }

  console.log(`  ${roleKey.padEnd(14)} + ${missing.join(", ")}`);
  if (!dryRun) {
    role.permissions.push(...missing);
    await role.save();
  }
};

if (sync) {
  // Bring every system role up to what config/permissions.js now declares,
  // adding only. Custom roles are never touched — they were built by hand and
  // nothing here knows what they were meant to include.
  for (const r of SYSTEM_ROLES) {
    await grant(r.key, r.permissions.filter((p) => p !== "*"));
  }
} else {
  const [roleKey, ...perms] = positional;
  await grant(roleKey, perms);
}

console.log(
  dryRun ? "\n  Dry run — nothing was written.\n" : "\n  Done.\n"
);
await mongoose.disconnect();
