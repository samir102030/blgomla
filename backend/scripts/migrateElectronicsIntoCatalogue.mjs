/**
 * Move the electronics section into the storefront catalogue.
 *
 *   node scripts/migrateElectronicsIntoCatalogue.mjs --confirm
 *   node scripts/migrateElectronicsIntoCatalogue.mjs --confirm --dry
 *
 * The section began as a student shelf: its own department tree in
 * `StudentCategory`, its own products marked `audience`, and a find hook that
 * kept both out of every storefront listing. It is not that any more. Anyone
 * browses it and anyone buys from it, and what a student gets is a discount —
 * which the coupon already expresses on its own through `applicableAudience`.
 *
 * So the departments become ordinary categories under one `Electronics` root,
 * and the products get filed under them like any other product. `audience`
 * survives, no longer as a wall but as the name of the branch, because that is
 * what the student coupon is scoped by and scoping it by a list of category ids
 * instead would need extending every time a department is added.
 *
 * Two details the storefront's category table forces:
 *
 *  - `name` and `slug` are both unique across all categories, and the two trees
 *    each have a "Switches". A colliding name is suffixed with its parent's, so
 *    the electronics one lands as "Switches (Components)" rather than failing
 *    the insert half way through the run.
 *
 *  - Levels shift down by one, since everything gains the `Electronics` root
 *    above it. The storefront menu draws three levels, so the deepest
 *    departments are reached from their parent's page rather than the menu.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Category from "../models/category.model.js";
import StudentCategory from "../models/studentCategory.model.js";
import Product from "../models/product.model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const args = process.argv.slice(2);
if (!args.includes("--confirm")) {
  console.error("Refusing to run without --confirm.");
  process.exit(1);
}
const dry = args.includes("--dry");

const ROOT_NAME = "Electronics";
const ROOT_NAME_AR = "إلكترونيات";

await mongoose.connect(process.env.MONGO_URI);

const existingRoot = await Category.findOne({ name: ROOT_NAME });
if (existingRoot) {
  console.error(`A category named "${ROOT_NAME}" already exists (${existingRoot._id}). Nothing to do.`);
  await mongoose.disconnect();
  process.exit(1);
}

const departments = await StudentCategory.find({ deleted: { $ne: true } })
  .sort({ level: 1, order: 1, name: 1 })
  .lean();

console.log(`departments to move: ${departments.length}`);
if (dry) {
  const byLevel = departments.reduce((a, d) => ({ ...a, [d.level]: (a[d.level] || 0) + 1 }), {});
  console.log("by level:", JSON.stringify(byLevel));
  console.log("products to re-file:", await Product.countDocuments({ studentCategory: { $ne: null } }));
  await mongoose.disconnect();
  process.exit(0);
}

// The root everything hangs from. sortOrder puts it after the existing roots
// rather than in the middle of a menu somebody already knows the shape of.
const lastRoot = await Category.findOne({ parentCategory: null }).sort({ sortOrder: -1 }).select("sortOrder");
// Created switched off. The branch exists, staff can arrange it, and nothing
// of it reaches a customer until somebody turns it on from the Storefront
// Visibility page — which is the same switch every other category answers to.
const root = await new Category({
  name: ROOT_NAME,
  nameAr: ROOT_NAME_AR,
  parentCategory: null,
  sectionKey: "electronics",
  sortOrder: (lastRoot?.sortOrder || 0) + 1,
  isActive: false,
  showInMenu: true,
}).save();
console.log(`created root ${root.name} (${root._id})`);

/**
 * A name the catalogue will actually accept.
 *
 * Categories are unique on both `name` and `slug`, and the slug is derived
 * from the name by the model — so two departments called "Motors & Drives"
 * and "Motors / Drives" collide on the slug while their names look distinct.
 * Checking only the name lets the run die half way through on a duplicate key.
 *
 * The parent's name disambiguates first, because "Switches (Components)" says
 * something true about where it sits. A counter is the fallback for the case
 * where even that is taken.
 */
const slugOf = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-zA-Z0-9؀-ۿ]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const isTaken = async (name) =>
  Boolean(await Category.exists({ $or: [{ name }, { slug: slugOf(name) }] }));

const freeName = async (wanted, parentName) => {
  if (!(await isTaken(wanted))) return wanted;
  const withParent = `${wanted} (${parentName})`;
  if (!(await isTaken(withParent))) return withParent;
  for (let n = 2; n < 100; n += 1) {
    const candidate = `${withParent} ${n}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error(`Could not find a free name for "${wanted}"`);
};

/** studentCategory _id → new Category _id */
const map = new Map();
let renamed = 0;

for (const dept of departments) {
  const parent = dept.parentCategory ? map.get(String(dept.parentCategory)) : root._id;
  if (!parent) {
    console.warn(`  skipped "${dept.name}" — its parent was not migrated`);
    continue;
  }

  const parentDoc = await Category.findById(parent).select("name");
  const name = await freeName(dept.name, parentDoc?.name || ROOT_NAME);
  if (name !== dept.name) {
    renamed += 1;
    console.log(`  renamed "${dept.name}" -> "${name}"`);
  }

  const created = await new Category({
    name,
    nameAr: dept.nameAr || "",
    description: dept.description || "",
    descriptionAr: dept.descriptionAr || "",
    image: dept.image || "",
    parentCategory: parent,
    sortOrder: dept.order || 0,
    isActive: dept.active !== false,
    showInMenu: true,
  }).save();

  map.set(String(dept._id), created._id);
}

console.log(`categories created: ${map.size}${renamed ? ` (${renamed} renamed for a clash)` : ""}`);

// Re-file the products. One bulk write per department beats 5,656 saves, and
// nothing on the product needs a hook to run — category and audience are both
// plain fields.
const ops = [];
for (const [studentId, categoryId] of map) {
  ops.push({
    updateMany: {
      filter: { studentCategory: new mongoose.Types.ObjectId(studentId) },
      update: { $set: { category: categoryId, audience: "electronics" } },
    },
  });
}

let moved = 0;
if (ops.length) {
  const res = await Product.bulkWrite(ops, { ordered: false });
  moved = res.modifiedCount;
}
console.log(`products re-filed: ${moved}`);

const stranded = await Product.countDocuments({ studentCategory: { $ne: null }, category: null });
if (stranded) console.warn(`WARNING: ${stranded} product(s) still have no category`);

await mongoose.disconnect();
console.log("done");
