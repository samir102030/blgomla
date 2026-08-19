/**
 * Dump every category in the database to JSON, CSV and a readable tree.
 *
 * Unlike listCategories.js this keeps the tree intact — parent, level and the
 * materialized path — so the export can be handed to an import/mapping step
 * without having to re-derive who sits under whom. Soft-deleted rows are
 * included but flagged, because "what's in the DB" and "what a shopper sees"
 * are different questions and the caller may want either.
 *
 *   node scripts/dumpCategories.mjs [outDir]
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

dotenv.config();

const outDir = process.argv[2] || "C:\\Users\\Crafted\\categories-export";

const csvCell = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected: ${mongoose.connection.name}`);

  const cats = await Category.find({}).lean().sort({ level: 1, sortOrder: 1, name: 1 });

  // One aggregate beats one count per category — this list runs to the hundreds.
  const counts = new Map();
  for (const row of await Product.aggregate([
    { $match: { deleted: { $ne: true } } },
    { $group: { _id: "$category", n: { $sum: 1 } } },
  ])) {
    if (row._id) counts.set(String(row._id), row.n);
  }

  const byId = new Map(cats.map((c) => [String(c._id), c]));
  const childrenOf = new Map();
  for (const c of cats) {
    const key = c.parentCategory ? String(c.parentCategory) : "__root__";
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key).push(c);
  }

  const rows = cats.map((c) => {
    const parent = c.parentCategory ? byId.get(String(c.parentCategory)) : null;
    return {
      id: String(c._id),
      name: c.name,
      nameAr: c.nameAr || "",
      slug: c.slug || "",
      level: c.level ?? 0,
      path: c.path || "",
      parentId: c.parentCategory ? String(c.parentCategory) : "",
      parentName: parent ? parent.name : "",
      childrenCount: (childrenOf.get(String(c._id)) || []).length,
      productsCount: counts.get(String(c._id)) || 0,
      isActive: c.isActive !== false,
      showInMenu: c.showInMenu !== false,
      deleted: c.deleted === true,
      sortOrder: c.sortOrder ?? 0,
      image: c.image || "",
      description: c.description || "",
      descriptionAr: c.descriptionAr || "",
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : "",
    };
  });

  const rowById = new Map(rows.map((r) => [r.id, r]));
  const treeLines = [];
  const walk = (parentKey, depth) => {
    for (const c of childrenOf.get(parentKey) || []) {
      const r = rowById.get(String(c._id));
      const flags = [
        r.deleted ? "DELETED" : null,
        r.isActive ? null : "inactive",
        r.showInMenu ? null : "hidden-from-menu",
      ].filter(Boolean);
      treeLines.push(
        `${"  ".repeat(depth)}- ${r.name}${r.nameAr ? ` / ${r.nameAr}` : ""}` +
          `  [${r.slug}]  (${r.productsCount} products)` +
          (flags.length ? `  <${flags.join(", ")}>` : "")
      );
      walk(r.id, depth + 1);
    }
  };
  walk("__root__", 0);

  // A row whose parent is missing from the collection would vanish from the
  // walk above, so surface it rather than let the tree quietly under-report.
  const orphans = rows.filter((r) => r.parentId && !rowById.has(r.parentId));
  if (orphans.length) {
    treeLines.push("", `ORPHANS (parent not found, ${orphans.length}):`);
    for (const o of orphans) treeLines.push(`- ${o.name} [${o.slug}] -> missing parent ${o.parentId}`);
  }

  const cols = Object.keys(rows[0] || { id: "" });
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");

  const roots = rows.filter((r) => !r.parentId).length;
  const summary = [
    `total categories:   ${rows.length}`,
    `root (level 0):     ${roots}`,
    `active:             ${rows.filter((r) => r.isActive && !r.deleted).length}`,
    `soft-deleted:       ${rows.filter((r) => r.deleted).length}`,
    `shown in menu:      ${rows.filter((r) => r.showInMenu && r.isActive && !r.deleted).length}`,
    `with products:      ${rows.filter((r) => r.productsCount > 0).length}`,
    `empty:              ${rows.filter((r) => r.productsCount === 0).length}`,
    `max depth:          ${Math.max(0, ...rows.map((r) => r.level))}`,
    `orphans:            ${orphans.length}`,
  ].join("\n");

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "categories.json"), JSON.stringify(rows, null, 2), "utf8");
  await writeFile(path.join(outDir, "categories.csv"), "\uFEFF" + csv, "utf8"); // BOM: Excel reads the Arabic correctly
  await writeFile(
    path.join(outDir, "categories-tree.txt"),
    `${summary}\n\n=== CATEGORY TREE ===\n\n${treeLines.join("\n")}\n`,
    "utf8"
  );

  console.log(summary);
  console.log(`\nWritten to ${outDir}`);
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
