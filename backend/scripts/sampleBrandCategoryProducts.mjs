/** Read-only: what is actually filed under the brand-named categories. */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Brand from "../models/brand.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

const normalize = (s) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const MENU_ROOTS = [
  "computer", "laptop", "security-surveillance", "network", "printers",
  "cashier-systems", "uninterruptible-power-supply-ups", "office-solution",
  "accessories",
];

await mongoose.connect(process.env.MONGO_URI);

const cats = await Category.find({ deleted: { $ne: true } })
  .select("name slug parentCategory level")
  .lean();
const byId = new Map(cats.map((c) => [String(c._id), c]));
const bySlug = new Map(cats.map((c) => [c.slug, c]));

// The destinations available: everything under the nine real departments.
const childrenOf = new Map();
for (const c of cats) {
  if (!c.parentCategory) continue;
  const p = String(c.parentCategory);
  childrenOf.set(p, [...(childrenOf.get(p) || []), c]);
}
console.log("=== destinations (the nine departments) ===");
for (const slug of MENU_ROOTS) {
  const root = bySlug.get(slug);
  if (!root) continue;
  const kids = childrenOf.get(String(root._id)) || [];
  console.log(`\n${root.name}  [${root.slug}]`);
  for (const k of kids) {
    const grand = childrenOf.get(String(k._id)) || [];
    console.log(`   ${k.name}  [${k.slug}]`);
    for (const g of grand) console.log(`      ${g.name}  [${g.slug}]`);
  }
}

const brands = await Brand.find({ deleted: { $ne: true } }).select("name").lean();
const brandByNorm = new Map(brands.map((b) => [normalize(b.name), b]));
const hits = cats.filter((c) => brandByNorm.has(normalize(c.name)));

console.log("\n\n=== what sits under each brand-named category ===");
for (const c of hits) {
  const rows = await Product.find({ category: c._id, deleted: { $ne: true } })
    .select("name")
    .limit(6)
    .lean();
  const total = await Product.countDocuments({
    category: c._id,
    deleted: { $ne: true },
  });
  if (!total) continue;
  console.log(`\n${c.name} (${total}) — parent: ${c.parentCategory ? byId.get(String(c.parentCategory))?.name : "(root)"}`);
  for (const r of rows) console.log(`   ${r.name.slice(0, 96)}`);
}

await mongoose.disconnect();
