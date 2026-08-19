/**
 * Recompute `level` and `path` for every category.
 *
 *   node scripts/rebuildCategoryLevels.mjs          # report
 *   node scripts/rebuildCategoryLevels.mjs --apply  # write
 *
 * `parentCategory` is the tree; `level` and `path` are a cache of it, filled in
 * by a pre-save hook. The re-parenting ran through `updateOne`, which does not
 * fire that hook, so a category can now have a parent and still claim to be a
 * root. The UI builds its tree from `parentCategory` and is unaffected, but
 * anything reading `level` — reports, sorting, any future query — is being told
 * something that stopped being true.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Category from "../models/category.model.js";

const apply = process.argv.includes("--apply");

await mongoose.connect(process.env.MONGO_URI);

const all = await Category.find({}).select("name slug parentCategory level path").lean();
const byId = new Map(all.map((c) => [String(c._id), c]));

const childrenOf = new Map();
const roots = [];
for (const c of all) {
  const parentId = c.parentCategory ? String(c.parentCategory) : null;
  if (parentId && byId.has(parentId)) {
    childrenOf.set(parentId, [...(childrenOf.get(parentId) || []), c]);
  } else {
    roots.push(c);
  }
}

const updates = [];
const walk = (node, level, parentPath) => {
  const path = parentPath ? `${parentPath}/${node.slug}` : `/${node.slug}`;
  if (node.level !== level || node.path !== path) {
    updates.push({ id: node._id, name: node.name, from: node.level, level, path });
  }
  for (const child of childrenOf.get(String(node._id)) || []) walk(child, level + 1, path);
};
for (const root of roots) walk(root, 0, "");

console.log(`categories:        ${all.length}`);
console.log(`true roots:        ${roots.length}`);
console.log(`stale level/path:  ${updates.length}\n`);

for (const u of updates.slice(0, 12)) {
  console.log(`  ${u.name.padEnd(34)} level ${u.from} → ${u.level}`);
}
if (updates.length > 12) console.log(`  … and ${updates.length - 12} more`);

if (apply && updates.length) {
  await Category.bulkWrite(
    updates.map((u) => ({
      updateOne: { filter: { _id: u.id }, update: { $set: { level: u.level, path: u.path } } },
    }))
  );
  console.log("\nApplied.");
} else if (!apply) {
  console.log("\nRun again with --apply to write.");
}

await mongoose.disconnect();
