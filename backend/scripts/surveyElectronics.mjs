/**
 * What a reset of the electronics branch would actually touch. Reads only.
 *
 *   node scripts/surveyElectronics.mjs
 *
 * The branch is 140-odd categories and several thousand products, and most of
 * what hangs off them is invisible from the dashboard: order lines that name a
 * product, bundles built out of them, carts people have not checked out yet.
 * Deleting first and discovering that afterwards is not recoverable, so this
 * counts everything first and writes nothing.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;

const Categories = db.collection("categories");
const Products = db.collection("products");
const Orders = db.collection("orders");
const Collections = db.collection("collections");
const Users = db.collection("users");
const Reviews = db.collection("reviews");

const line = (label, value) => console.log(`  ${String(label).padEnd(46)} ${value}`);

// ── The root, and why it matters ──────────────────────────────────────
const root = await Categories.findOne({ sectionKey: "electronics" });
console.log("\n=== the section root ===");
if (!root) {
  console.log("  NOT FOUND — nothing identifies the electronics section.");
} else {
  line("name", `${root.name} / ${root.nameAr || "-"}`);
  line("_id", String(root._id));
  line("slug", root.slug);
  line("sectionKey", root.sectionKey);
  line("isActive (this is the publish switch)", root.isActive);
}

// ── The subtree ───────────────────────────────────────────────────────
const all = await Categories.find({}).project({ _id: 1, parentCategory: 1, name: 1 }).toArray();
const childrenOf = new Map();
for (const c of all) {
  if (!c.parentCategory) continue;
  const p = String(c.parentCategory);
  if (!childrenOf.has(p)) childrenOf.set(p, []);
  childrenOf.get(p).push(String(c._id));
}
const subtree = [];
if (root) {
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
const descendants = subtree.filter((id) => id !== String(root?._id));
const asIds = (list) => list.map((id) => new mongoose.Types.ObjectId(id));

console.log("\n=== categories ===");
line("in the catalogue, all in", all.length);
line("in the electronics subtree (incl. root)", subtree.length);
line("descendants that a reset would delete", descendants.length);
line("outside the branch, untouched", all.length - subtree.length);

// ── Products ──────────────────────────────────────────────────────────
// Straight through the driver, not the model: the schema hides unpublished
// sections from every find(), which is exactly the rows this has to count.
const inBranch = { category: { $in: asIds(subtree) } };
const productTotal = await Products.countDocuments(inBranch);
const audienceElectronics = await Products.countDocuments({ audience: "electronics" });
const electronicsOutside = await Products.countDocuments({
  audience: "electronics",
  category: { $nin: asIds(subtree) },
});
const publicInside = await Products.countDocuments({
  ...inBranch,
  audience: { $ne: "electronics" },
});
const orphanCategory = await Products.countDocuments({
  $or: [{ category: null }, { category: { $exists: false } }],
});

console.log("\n=== products ===");
line("filed under the branch (every state)", productTotal);
line("  · active, not deleted", await Products.countDocuments({ ...inBranch, isActive: true, deleted: { $ne: true } }));
line("  · inactive or soft-deleted", await Products.countDocuments({ ...inBranch, $or: [{ isActive: false }, { deleted: true }] }));
line("  · approvalStatus != approved", await Products.countDocuments({ ...inBranch, approvalStatus: { $ne: "approved" } }));
line("marked audience:electronics anywhere", audienceElectronics);
line("  · marked electronics but OUTSIDE branch", electronicsOutside);
line("  · inside branch but NOT marked electronics", publicInside);
line("products in the whole catalogue", await Products.countDocuments({}));
line("products with no category at all", orphanCategory);

// ── What points at those products ─────────────────────────────────────
const productIds = await Products.find(inBranch).project({ _id: 1 }).toArray();
const ids = productIds.map((p) => p._id);

console.log("\n=== what else points at them ===");
const ordersTouching = await Orders.countDocuments({ "orderItems.product": { $in: ids } });
line("orders containing one (history)", ordersTouching);
const collectionsTouching = await Collections.countDocuments({ "items.product": { $in: ids } });
line("bundles built from one", collectionsTouching);
const cartsTouching = await Users.countDocuments({ "cart.product": { $in: ids } });
line("customers with one in their cart", cartsTouching);
const wishlistTouching = await Users.countDocuments({ wishlist: { $in: ids } });
line("customers with one on a wishlist", wishlistTouching);
line("reviews written on one", await Reviews.countDocuments({ product: { $in: ids } }));
for (const name of ["stockalerts", "productquestions"]) {
  const exists = await db.listCollections({ name }).hasNext();
  if (exists) line(`rows in ${name}`, await db.collection(name).countDocuments({ product: { $in: ids } }));
}

// One order line, to show whether history survives losing the product.
const sampleOrder = await Orders.findOne({ "orderItems.product": { $in: ids } });
if (sampleOrder) {
  const item = sampleOrder.orderItems.find((i) => ids.some((id) => String(id) === String(i.product)));
  console.log("\n  a sample order line, to see what it keeps on its own:");
  console.log("   ", JSON.stringify(item).slice(0, 400));
}

await mongoose.disconnect();
console.log("\nnothing was written.\n");
