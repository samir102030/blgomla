/**
 * Work out which department each stranded category belongs under, by reading
 * the structure of the site the categories were imported from.
 *
 *   node scripts/planCategoryReparent.mjs          # report only
 *   node scripts/planCategoryReparent.mjs --apply  # re-parent
 *
 * The import flattened a tree. The source site files "Motherboard" under
 * "Computers" and "Ink / Toner" under "Printing Solutions"; the import dropped
 * the parents and landed all 157 of them as roots, which is why the category
 * bar became a wall and why 5,170 products are now sitting somewhere no shopper
 * can reach from it.
 *
 * The scrape in catalog-import/shelves.json still has the parents — a nested
 * path like `computers/motherboard` is the answer for that category. This reads
 * those paths, maps the source department onto the equivalent one here, and
 * re-parents.
 *
 * Nothing is deleted and no product moves: a category keeps its id, its name
 * and everything filed under it, and only gains a parent. That also makes it
 * reversible — `parentCategory: null` puts it back.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

const apply = process.argv.includes("--apply");
const SHELVES = "C:\\Users\\Crafted\\catalog-import\\shelves.json";

const normalize = (s) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Source department → the department here it corresponds to, by slug.
 *
 * Several source departments collapse onto one: the site splits networking
 * across "networking", "wired-networking" and a "networking-catalog", and all
 * three are the one NETWORK department here.
 */
const DEPARTMENT_MAP = {
  computers: "computer",
  laptops: "laptop",
  "laptops-category": "laptop",
  monitors: "monitors",
  networking: "network",
  "wired-networking": "network",
  "networking-catalog": "network",
  "printers-scanners-ink-and-toner-plotter": "printers",
  datashow: "projectors",
  "low-current-systems": "uninterruptible-power-supply-ups",
  ups: "uninterruptible-power-supply-ups",
  "point-of-sale": "cashier-systems",
  "point-of-sale-category": "cashier-systems",
  "security-camera": "security-surveillance",
  "surveillance-systems": "security-surveillance",
  "access-control": "access-control",
  "video-conference": "office-solution",
  "telecommunication-system": "office-solution",
  "call-center-solution": "office-solution",
  "interactive-whiteboard": "office-solution",
  "digital-signage": "office-solution",
  tv: "office-solution",
  "computer-gaming-accessories": "accessories",
  "gaming-accessories": "accessories",
};

await mongoose.connect(process.env.MONGO_URI);
console.log(apply ? "APPLYING\n" : "DRY RUN — nothing will be written\n");

const shelves = JSON.parse(await readFile(SHELVES, "utf8"));

/**
 * Shelves that are a promotion, not a department.
 *
 * The source site lists "Laptops" under Clearance and under Offers as well as
 * being a department in its own right. Reading a parent by name alone picks
 * whichever of those it meets, so the largest category in the catalogue — 1,182
 * laptops — came back filed under "clearance". A sale is not a place a product
 * lives, so these are never a parent.
 */
const PROMO_SHELVES = new Set([
  "clearance",
  "offers",
  "egyptfriday",
  "back-to-school",
  "wishlist",
  "wishlist-en",
  "compare",
  "orders",
  "orders-en",
]);

// slug → the department it sits under on the source site.
const sourceParent = new Map();
const sourceParentByName = new Map();
for (const shelf of shelves) {
  const parts = String(shelf.path).split("/").filter(Boolean);
  if (parts.length < 2 || PROMO_SHELVES.has(parts[0])) continue;
  const leaf = parts[parts.length - 1];
  // First writer wins: the earliest non-promo path is the real home, and a
  // later duplicate listing shouldn't overwrite it.
  if (!sourceParent.has(leaf)) sourceParent.set(leaf, parts[0]);
  const name = normalize(shelf.label);
  if (!sourceParentByName.has(name)) sourceParentByName.set(name, parts[0]);
}

/**
 * The source site's own departments, by slug and by name.
 *
 * A category that IS a department there has no parent path to read, and those
 * are the biggest ones — "Laptops", "Networking", "Computers". They are the
 * duplicates of the departments here, so they map onto them directly.
 */
const sourceDepartments = new Map();
for (const shelf of shelves) {
  const parts = String(shelf.path).split("/").filter(Boolean);
  if (parts.length !== 1 || PROMO_SHELVES.has(parts[0])) continue;
  sourceDepartments.set(normalize(shelf.label), parts[0]);
  sourceDepartments.set(parts[0], parts[0]);
}

const cats = await Category.find({ deleted: { $ne: true } })
  .select("name slug parentCategory showInMenu")
  .lean();
const bySlug = new Map(cats.map((c) => [c.slug, c]));
const byNorm = new Map(cats.map((c) => [normalize(c.name), c]));

const counts = new Map();
for (const row of await Product.aggregate([
  { $match: { deleted: { $ne: true } } },
  { $group: { _id: "$category", n: { $sum: 1 } } },
])) {
  if (row._id) counts.set(String(row._id), row.n);
}
// A category's weight is its own products plus everything beneath it.
const childrenOf = new Map();
for (const c of cats) {
  if (!c.parentCategory) continue;
  const p = String(c.parentCategory);
  childrenOf.set(p, [...(childrenOf.get(p) || []), c]);
}
const subtreeCount = (id) => {
  let n = counts.get(String(id)) || 0;
  for (const child of childrenOf.get(String(id)) || []) n += subtreeCount(child._id);
  return n;
};

const hiddenRoots = cats.filter((c) => !c.parentCategory && c.showInMenu === false);

const planned = [];
const unplaced = [];
for (const cat of hiddenRoots) {
  // A department first — "Laptops" is the source's own Laptops department, not
  // the "Laptops" shelf that happens to sit under something else — then the
  // subcategory lookup.
  const sourceDept =
    sourceDepartments.get(cat.slug) ||
    sourceDepartments.get(normalize(cat.name)) ||
    sourceParent.get(cat.slug) ||
    sourceParentByName.get(normalize(cat.name));
  const targetSlug = sourceDept ? DEPARTMENT_MAP[sourceDept] : null;
  const target = targetSlug ? bySlug.get(targetSlug) : null;
  const products = subtreeCount(cat._id);

  if (!target || String(target._id) === String(cat._id)) {
    unplaced.push({ cat, products, sourceDept: sourceDept || "—" });
    continue;
  }
  planned.push({ cat, target, products, sourceDept });
}

const byTarget = new Map();
for (const p of planned) {
  byTarget.set(p.target.slug, [...(byTarget.get(p.target.slug) || []), p]);
}

console.log("=== WHERE EACH STRANDED CATEGORY WOULD GO ===\n");
for (const [slug, list] of [...byTarget.entries()].sort(
  (a, b) =>
    b[1].reduce((n, x) => n + x.products, 0) - a[1].reduce((n, x) => n + x.products, 0)
)) {
  const total = list.reduce((n, x) => n + x.products, 0);
  console.log(`${bySlug.get(slug).name}  ← ${list.length} categories, ${total} products`);
  for (const p of list.sort((a, b) => b.products - a.products).slice(0, 8)) {
    console.log(`     ${String(p.products).padStart(5)}  ${p.cat.name}`);
  }
  if (list.length > 8) console.log(`     … and ${list.length - 8} more`);
  console.log("");
}

const placedProducts = planned.reduce((n, p) => n + p.products, 0);
const unplacedProducts = unplaced.reduce((n, p) => n + p.products, 0);

console.log(`=== NO PLACE FOUND (${unplaced.length} categories, ${unplacedProducts} products) ===\n`);
for (const u of unplaced.sort((a, b) => b.products - a.products).slice(0, 20)) {
  console.log(`  ${String(u.products).padStart(5)}  ${u.cat.name.padEnd(34)} source: ${u.sourceDept}`);
}
if (unplaced.length > 20) console.log(`  … and ${unplaced.length - 20} more`);

console.log(`\nwould re-parent: ${planned.length} categories / ${placedProducts} products`);
console.log(`would stay put:  ${unplaced.length} categories / ${unplacedProducts} products`);

if (apply) {
  for (const p of planned) {
    // showInMenu goes back on: it is a subcategory now, and the menu decides
    // what to show from the department above it.
    await Category.updateOne(
      { _id: p.cat._id },
      { $set: { parentCategory: p.target._id, showInMenu: true } }
    );
  }
  console.log("\nApplied. Re-run scripts/dumpCategories.mjs to see the new tree.");
} else {
  console.log("\nRun again with --apply to write.");
}

await mongoose.disconnect();
