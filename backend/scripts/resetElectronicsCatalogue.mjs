/**
 * Replace the electronics branch with a fresh pair of sheets.
 *
 *   node scripts/resetElectronicsCatalogue.mjs --dry
 *   node scripts/resetElectronicsCatalogue.mjs --confirm
 *
 * Optional: --categories <path> --products <path> to point at other files.
 *
 * Deletes every category under the electronics root and every product filed in
 * that branch, then rebuilds both from the sheets. Written as one script rather
 * than "delete in the dashboard, then bulk-upload" because that route gets
 * three things wrong, each of them silently:
 *
 *   1. The root carries `sectionKey: "electronics"`. That field, not its name,
 *      is how the storefront finds the section, and its `isActive` is the
 *      switch that publishes it. Delete the root and the section stops existing
 *      — there is no error, the branch simply never comes back. So the root is
 *      kept, and only its descendants are replaced.
 *
 *   2. `Product.audience` defaults to "public" and the bulk importer never
 *      sets it. Uploading the sheet as-is would file 5,656 electronics products
 *      into the general catalogue, where they would appear on the storefront
 *      immediately, published or not.
 *
 *   3. The importer resolves a category by name across the whole catalogue.
 *      "Switches" exists twice — once in this branch and once outside it — so
 *      name resolution has to be scoped to the branch being built, or those
 *      products land in somebody else's department.
 *
 * Orders are never touched. An order line keeps its own copy of what was
 * bought, so history survives the product going away, and rewriting a customer's
 * receipt because the catalogue was re-imported would be the wrong repair.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
/*
  The ExcelJS shim, not the `xlsx` package — commit 6 took that off
  package.json. Its readers are async, so the calls below gained an `await`.
*/
import XLSX from "../utils/xlsxCompat.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import Brand from "../models/brand.model.js";
import { houseStoreId } from "../utils/houseStore.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const args = process.argv.slice(2);
const confirmed = args.includes("--confirm");
// --plan reads the sheets and checks them without opening a connection, so the
// shape of what would be built can be seen from a machine that has no business
// holding the production connection string.
const planOnly = args.includes("--plan");
if (!confirmed && !planOnly && !args.includes("--dry")) {
  console.error("usage: node scripts/resetElectronicsCatalogue.mjs (--plan | --dry | --confirm)");
  console.error("       [--categories <xlsx>] [--products <xlsx>]");
  console.error("  --plan     read and check the sheets only; no database");
  console.error("  --dry      also count what is there now; writes nothing");
  console.error("  --confirm  do it");
  process.exit(1);
}
const argValue = (flag, fallback) => {
  const at = args.indexOf(flag);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};

const DEFAULT_DIR = "C:/Users/Crafted/Downloads/belgomla/free electronics";
const CATEGORIES_FILE = argValue("--categories", `${DEFAULT_DIR}/free-electronic-categories.xlsx`);
const PRODUCTS_FILE = argValue("--products", `${DEFAULT_DIR}/free-electronic-products.xlsx`);

const norm = (value) =>
  String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const truthy = (value) => String(value ?? "").trim().toUpperCase() === "TRUE";
const say = (label, value) => console.log(`  ${String(label).padEnd(44)} ${value}`);

const sheetRows = async (file, name) => {
  const wb = await XLSX.readFile(file);
  const sheet = wb.Sheets[name] || wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
};

/*
  The sheets are checked before anything is opened.

  Every one of these failures is cheaper to find now than after the branch has
  been deleted, and none of them needs a database to spot: a product naming a
  category the sheet does not define, a parent that resolves to nothing, a loop.
*/
const categoryRowsEarly = await sheetRows(CATEGORIES_FILE, "Categories");
const productRowsEarly = await sheetRows(PRODUCTS_FILE, "Products");
const definedNames = new Set(categoryRowsEarly.map((r) => norm(r["Category Name"])));

const problems = [];
const missingParents = [...new Set(
  categoryRowsEarly
    .map((r) => String(r["Parent Category"]).trim())
    .filter((p) => p && !definedNames.has(norm(p)))
)];
if (missingParents.length) {
  problems.push(`parents named but not defined in the sheet: ${missingParents.join(", ")}`);
}
const orphanProducts = [...new Set(productRowsEarly.map((r) => norm(r["Category Name"])))].filter(
  (name) => name && !definedNames.has(name)
);
if (orphanProducts.length) {
  problems.push(
    `${orphanProducts.length} product categories absent from the categories sheet: ${orphanProducts.slice(0, 8).join(", ")}`
  );
}
const nameless = productRowsEarly.filter((r) => !String(r["Product Name"]).trim()).length;
if (nameless) problems.push(`${nameless} product rows with no name`);
const priceless = productRowsEarly.filter((r) => !Number.isFinite(parseFloat(r["Price"]))).length;
if (priceless) problems.push(`${priceless} product rows with no usable price`);

// A parent chain that closes a loop would recurse forever while building.
{
  const parentOf = new Map(
    categoryRowsEarly.map((r) => [norm(r["Category Name"]), norm(r["Parent Category"])])
  );
  for (const start of parentOf.keys()) {
    const seen = new Set([start]);
    let cursor = parentOf.get(start);
    while (cursor) {
      if (seen.has(cursor)) {
        problems.push(`parent loop involving "${cursor}"`);
        break;
      }
      seen.add(cursor);
      cursor = parentOf.get(cursor);
    }
  }
}

console.log("\n=== the sheets ===");
say("categories", categoryRowsEarly.length);
say("  · re-parented to the section root", categoryRowsEarly.filter((r) => !String(r["Parent Category"]).trim()).length);
say("products", productRowsEarly.length);
say("distinct categories used by products", new Set(productRowsEarly.map((r) => norm(r["Category Name"]))).size);
say("distinct brands referenced", new Set(productRowsEarly.map((r) => norm(r["Brand Name"])).filter(Boolean)).size);
say("problems found", problems.length);
for (const p of problems) console.log(`    ! ${p}`);

if (problems.length) {
  console.error("\nNothing was opened. Fix the sheets first.\n");
  process.exit(1);
}
if (planOnly) {
  console.log("\nplan only — no database was contacted.\n");
  process.exit(0);
}

await mongoose.connect(process.env.MONGO_URI);
const host = (String(process.env.MONGO_URI).split("@")[1] || "").split("/")[0];
console.log(`\nconnected to ${host || "(local)"}`);
console.log(confirmed ? "MODE: --confirm — this writes.\n" : "MODE: --dry — nothing will be written.\n");

// ── 0. The root, which we keep ────────────────────────────────────────
const root = await Category.findOne({ sectionKey: "electronics" }).lean();
if (!root) {
  console.error(
    'No category carries sectionKey "electronics". Without it the storefront\n' +
      "cannot find the section, and this script has nothing to hang the new\n" +
      "branch from. Set that field on the root category first."
  );
  await mongoose.disconnect();
  process.exit(1);
}
console.log("=== the root (kept) ===");
say("name", `${root.name} / ${root.nameAr || "-"}`);
say("_id", String(root._id));
say("isActive (publish switch)", root.isActive);

// ── 1. What is there now ──────────────────────────────────────────────
const everyCategory = await Category.find({}).select("_id parentCategory name").lean();
const childrenOf = new Map();
for (const c of everyCategory) {
  if (!c.parentCategory) continue;
  const parent = String(c.parentCategory._id || c.parentCategory);
  if (!childrenOf.has(parent)) childrenOf.set(parent, []);
  childrenOf.get(parent).push(String(c._id));
}
const subtree = [];
{
  const queue = [String(root._id)];
  const seen = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    subtree.push(id);
    queue.push(...(childrenOf.get(id) || []));
  }
}
const descendants = subtree.filter((id) => id !== String(root._id));
const asId = (id) => new mongoose.Types.ObjectId(String(id));

// Straight through the driver: the schema hides unpublished sections from
// every find(), which is exactly the rows that have to be counted here.
const products = mongoose.connection.collection("products");
const doomedProducts = await products
  .find({ category: { $in: subtree.map(asId) } })
  .project({ _id: 1 })
  .toArray();
const doomedIds = doomedProducts.map((p) => p._id);

console.log("\n=== what is there now ===");
say("categories under the root", descendants.length);
say("products filed in the branch", doomedIds.length);
say("categories elsewhere (untouched)", everyCategory.length - subtree.length);

const orders = mongoose.connection.collection("orders");
const ordersTouching = await orders.countDocuments({ "orderItems.product": { $in: doomedIds } });
const collections = mongoose.connection.collection("collections");
const bundlesTouching = await collections.countDocuments({ "items.product": { $in: doomedIds } });
const users = mongoose.connection.collection("users");
const cartsTouching = await users.countDocuments({ "cart.product": { $in: doomedIds } });
const wishlistsTouching = await users.countDocuments({ wishlist: { $in: doomedIds } });
say("orders naming one (kept as history)", ordersTouching);
say("bundles built from one (needs a look)", bundlesTouching);
say("carts holding one (line removed)", cartsTouching);
say("wishlists holding one (line removed)", wishlistsTouching);

// ── 2. What the sheets hold ───────────────────────────────────────────
const categoryRows = await sheetRows(CATEGORIES_FILE, "Categories");
const productRows = await sheetRows(PRODUCTS_FILE, "Products");

console.log("\n=== what the sheets hold ===");
say("categories in the sheet", categoryRows.length);
say("  · with no parent (re-parented to root)", categoryRows.filter((r) => !String(r["Parent Category"]).trim()).length);
say("products in the sheet", productRows.length);

// Every product's category must exist in the categories sheet, or it would be
// created by name against the whole catalogue and land outside the branch.
const sheetCategoryNames = new Set(categoryRows.map((r) => norm(r["Category Name"])));
const unknown = [...new Set(productRows.map((r) => norm(r["Category Name"])))].filter(
  (name) => name && !sheetCategoryNames.has(name)
);
if (unknown.length) {
  console.error(`\n${unknown.length} product categories are not in the categories sheet:`);
  for (const name of unknown.slice(0, 15)) console.error(`  - ${name}`);
  console.error("Nothing was written. Fix the sheets, or those products would be filed outside the branch.");
  await mongoose.disconnect();
  process.exit(1);
}
say("product categories missing from sheet", 0);

if (!confirmed) {
  console.log("\n=== what --confirm would do ===");
  console.log(`  delete ${doomedIds.length} products and ${descendants.length} categories,`);
  console.log(`  then create ${categoryRows.length} categories under "${root.name}"`);
  console.log(`  and ${productRows.length} products with audience "electronics".`);
  console.log("\ndry run — nothing written.\n");
  await mongoose.disconnect();
  process.exit(0);
}

// ── 3. Purge ──────────────────────────────────────────────────────────
console.log("\n=== purging ===");
const reviews = mongoose.connection.collection("reviews");
say("reviews removed", (await reviews.deleteMany({ product: { $in: doomedIds } })).deletedCount);
for (const name of ["stockalerts", "productquestions"]) {
  if (await mongoose.connection.db.listCollections({ name }).hasNext()) {
    const r = await mongoose.connection.collection(name).deleteMany({ product: { $in: doomedIds } });
    say(`${name} removed`, r.deletedCount);
  }
}
// A cart or wishlist line pointing at a product that no longer exists renders
// as a blank row the customer cannot remove, so the lines go with it.
say(
  "cart lines pulled",
  (await users.updateMany({}, { $pull: { cart: { product: { $in: doomedIds } } } })).modifiedCount
);
say(
  "wishlist entries pulled",
  (await users.updateMany({}, { $pull: { wishlist: { $in: doomedIds } } })).modifiedCount
);
say("products deleted", (await products.deleteMany({ _id: { $in: doomedIds } })).deletedCount);
say(
  "categories deleted",
  (await mongoose.connection.collection("categories").deleteMany({ _id: { $in: descendants.map(asId) } }))
    .deletedCount
);

// ── 4. Rebuild the categories ─────────────────────────────────────────
//
// Parents before children, resolved against the rows being created rather than
// against the catalogue, so "Switches" here never resolves to the "Switches"
// that lives outside this branch.
console.log("\n=== creating categories ===");
const rowByName = new Map(categoryRows.map((r) => [norm(r["Category Name"]), r]));
const createdIdByName = new Map();

const createCategory = async (name, chain = new Set()) => {
  const key = norm(name);
  if (createdIdByName.has(key)) return createdIdByName.get(key);
  const row = rowByName.get(key);
  if (!row) return null;
  if (chain.has(key)) throw new Error(`category parent loop at "${name}"`);
  chain.add(key);

  const parentName = String(row["Parent Category"]).trim();
  // No parent in the sheet means "top of this branch", not "top of the shop".
  const parentId = parentName ? await createCategory(parentName, chain) : root._id;

  const doc = await Category.create({
    name: String(row["Category Name"]).trim(),
    nameAr: String(row["Arabic Name"] ?? "").trim(),
    description: String(row["Description"] ?? "").trim(),
    descriptionAr: String(row["Arabic Description"] ?? "").trim(),
    image: String(row["Image URL"] ?? "").trim() || undefined,
    parentCategory: parentId,
    sortOrder: Number(row["Sort Order"]) || 0,
    isActive: row["Active"] === "" ? true : truthy(row["Active"]),
    showInMenu: row["Show In Menu"] === "" ? true : truthy(row["Show In Menu"]),
  });
  createdIdByName.set(key, doc._id);
  return doc._id;
};

for (const row of categoryRows) await createCategory(row["Category Name"]);
say("categories created", createdIdByName.size);

// Parents keep a list of their children, and nothing else writes it here.
for (const [, id] of createdIdByName) {
  const kids = await Category.find({ parentCategory: id }).select("_id").lean();
  if (kids.length) {
    await Category.updateOne({ _id: id }, { $set: { subCategories: kids.map((k) => k._id) } });
  }
}
await Category.updateOne(
  { _id: root._id },
  { $set: { subCategories: categoryRows.filter((r) => !String(r["Parent Category"]).trim())
      .map((r) => createdIdByName.get(norm(r["Category Name"]))).filter(Boolean) } }
);

// ── 5. Rebuild the products ───────────────────────────────────────────
console.log("\n=== creating products ===");
const store = await houseStoreId();
if (!store) {
  console.error(
    "No house store — Product.store would be blank and checkout refuses an order\n" +
      "whose products have no store. Create the shop's own store first."
  );
  await mongoose.disconnect();
  process.exit(1);
}
say("filed under store", String(store));

const brandIdByName = new Map();
const brandFor = async (name) => {
  const key = norm(name);
  if (!key) return undefined;
  if (brandIdByName.has(key)) return brandIdByName.get(key);
  let brand = await Brand.findOne({ name: new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).lean();
  if (!brand) brand = await Brand.create({ name: String(name).trim() });
  brandIdByName.set(key, brand._id);
  return brand._id;
};

const parsePairs = (text, split = "|") =>
  String(text ?? "").split(split).map((s) => s.trim()).filter(Boolean);

let made = 0;
let skipped = 0;
const batch = [];
for (const row of productRows) {
  const name = String(row["Product Name"] ?? "").trim();
  const price = parseFloat(row["Price"]);
  const categoryId = createdIdByName.get(norm(row["Category Name"]));
  if (!name || !Number.isFinite(price) || !categoryId) {
    skipped += 1;
    continue;
  }

  const images = [];
  for (let i = 1; i <= 4; i += 1) {
    const url = String(row[`Image URL ${i}`] ?? "").trim();
    if (url) images.push({ url, alt: name });
  }

  batch.push({
    name,
    nameAr: String(row["Arabic Name"] ?? "").trim(),
    sku: String(row["SKU"] ?? "").trim() || undefined,
    description: String(row["Description"] ?? "").trim(),
    descriptionAr: String(row["Arabic Description"] ?? "").trim(),
    price,
    stock: parseInt(row["Stock"], 10) || 0,
    minOrderQty: parseInt(row["Min Order Qty"], 10) || 1,
    category: categoryId,
    brand: await brandFor(row["Brand Name"]),
    salePercentage: parseFloat(row["Sale Percentage"]) || 0,
    saleActive: truthy(row["Sale Active"]),
    featured: truthy(row["Featured"]),
    tags: parsePairs(row["Tags"], ","),
    features: parsePairs(row["Features"]),
    attributes: parsePairs(row["Attributes"]).map((text) => {
      // First colon only — "Aspect Ratio:16:9" keeps its 9.
      const at = text.indexOf(":");
      return at > 0 ? { name: text.slice(0, at).trim(), value: text.slice(at + 1).trim() } : null;
    }).filter(Boolean),
    bulkPricing: parsePairs(row["Bulk Pricing"]).map((text) => {
      const [minQty, unitPrice] = text.split(":").map((s) => s.trim());
      return { minQty: parseInt(minQty, 10), unitPrice: parseFloat(unitPrice) };
    }).filter((b) => b.minQty && Number.isFinite(b.unitPrice)),
    ...(truthy(row["Installation Offered"])
      ? {
          installation: {
            offered: true,
            price: parseFloat(row["Installation Price"]) || 0,
            note: String(row["Installation Note"] ?? "").trim(),
            noteAr: String(row["Installation Note (Arabic)"] ?? "").trim(),
          },
        }
      : {}),
    images,
    // The three the importer cannot say, and the reason this is a script.
    audience: "electronics",
    store,
    approvalStatus: "approved",
    isActive: true,
    deleted: false,
  });
}

// insertMany in chunks: one 5,656-document write is a long transaction to hold
// open against a hosted cluster, and a failure halfway through it tells you
// nothing about where it stopped.
const CHUNK = 500;
for (let at = 0; at < batch.length; at += CHUNK) {
  const slice = batch.slice(at, at + CHUNK);
  const inserted = await Product.insertMany(slice, { ordered: false });
  made += inserted.length;
  console.log(`  ${made}/${batch.length}`);
}
say("products created", made);
say("rows skipped (no name, price or category)", skipped);

// ── 6. What it looks like now ─────────────────────────────────────────
console.log("\n=== after ===");
say("categories under the root", await Category.countDocuments({ parentCategory: { $exists: true } , _id: { $in: [...createdIdByName.values()] } }));
say("products marked electronics", await products.countDocuments({ audience: "electronics" }));
say("section is live (root isActive)", root.isActive);

await mongoose.disconnect();
console.log("\ndone.\n");
