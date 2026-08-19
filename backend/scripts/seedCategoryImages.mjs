/**
 * Give categories a picture, taken from the products they hold.
 *
 *   node scripts/seedCategoryImages.mjs                # report only, roots
 *   node scripts/seedCategoryImages.mjs --apply        # write them
 *   node scripts/seedCategoryImages.mjs --all --apply  # every category, not just roots
 *   node scripts/seedCategoryImages.mjs --apply --overwrite   # replace existing too
 *
 * Why this exists: the home page's "Shop by Category" rail draws
 * `category.image` when it is set and falls back to an emoji when it is not
 * (HomePage.tsx, the categoryRail section). A catalogue imported from the bulk
 * template arrives with the "Image URL" column blank, so every tile in that rail
 * renders as an emoji and the front page reads as unfinished — which is what it
 * did after the last import.
 *
 * A category has no picture of its own, but everything filed under it does. So
 * the representative image is borrowed from the branch: walk the subtree, take
 * the products, and pick one.
 *
 * The pick is deterministic — highest stock, then lowest price, then name — so
 * running this twice produces the same catalogue rather than reshuffling the
 * front page on every run. Stock first because a well-stocked line is the one
 * the department is actually selling, and a placeholder-looking photo tends to
 * belong to a discontinued item with a stock of zero.
 *
 * Existing images are left alone unless --overwrite is passed: a picture already
 * on a category was chosen by someone, and this script has no way to tell a
 * deliberate choice from a leftover.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const everyCategory = args.includes("--all");
const overwrite = args.includes("--overwrite");

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
const Categories = db.collection("categories");
const Products = db.collection("products");

const isRoot = { $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }] };

const targets = await Categories.find(
  everyCategory ? {} : isRoot,
  { projection: { name: 1, nameAr: 1, image: 1, parentCategory: 1 } }
).toArray();

// One pass over the tree rather than a query per level: the subtree of a root
// can run to a hundred categories and this script touches every one of them.
const all = await Categories.find({}, { projection: { parentCategory: 1 } }).toArray();
const childrenOf = new Map();
for (const c of all) {
  const parent = c.parentCategory ? String(c.parentCategory) : null;
  if (!parent) continue;
  childrenOf.set(parent, [...(childrenOf.get(parent) || []), String(c._id)]);
}
const subtreeOf = (id) => {
  const out = [];
  const queue = [String(id)];
  const seen = new Set(queue);
  while (queue.length) {
    const cur = queue.shift();
    out.push(cur);
    for (const child of childrenOf.get(cur) || []) {
      if (seen.has(child)) continue; // a cycle in bad data must not hang the walk
      seen.add(child);
      queue.push(child);
    }
  }
  return out;
};

console.log(`database: ${db.databaseName}`);
console.log(apply ? "WRITING\n" : "DRY RUN — nothing will be written\n");
console.log(
  `${"category".padEnd(34)} ${"products".padStart(9)}  image`
);
console.log("-".repeat(96));

let planned = 0;
let skipped = 0;
let empty = 0;
const updates = [];

for (const category of targets.sort((a, b) => (a.name || "").localeCompare(b.name || ""))) {
  const label = (category.name || "(unnamed)").slice(0, 33).padEnd(34);

  if (category.image && !overwrite) {
    skipped += 1;
    console.log(`${label} ${"—".padStart(9)}  kept (already has one)`);
    continue;
  }

  const ids = subtreeOf(category._id).map((id) => new mongoose.Types.ObjectId(id));

  // The candidate must actually carry a usable url — an images array can exist
  // and still hold nothing but an entry with an empty string.
  //
  // Spelled `$type` + `$ne` rather than the obvious `$nin: [null, ""]`, because
  // on a path that indexes into an array that predicate silently matches
  // nothing. "images.0" is ambiguous — index 0, or a field literally named "0" —
  // and $nin, being a negation, has to hold for *every* reading, so the
  // ambiguity makes it unsatisfiable. Measured on this catalogue: $exists 6141,
  // $ne "" 6141, $nin [null, ""] → 0.
  const [pick] = await Products.find(
    {
      category: { $in: ids },
      deleted: { $ne: true },
      "images.0.url": { $type: "string", $ne: "" },
    },
    { projection: { name: 1, images: { $slice: 1 }, stock: 1, price: 1 } }
  )
    .sort({ stock: -1, price: 1, name: 1 })
    .limit(1)
    .toArray();

  const count = await Products.countDocuments({ category: { $in: ids }, deleted: { $ne: true } });

  if (!pick) {
    empty += 1;
    console.log(`${label} ${String(count).padStart(9)}  no product with an image`);
    continue;
  }

  const url = pick.images[0].url;
  planned += 1;
  updates.push({ _id: category._id, url });
  console.log(`${label} ${String(count).padStart(9)}  ${url.slice(0, 46)}`);
}

console.log(
  `\n${planned} to set, ${skipped} left as they are, ${empty} with nothing to take from`
);

if (!apply) {
  console.log("\nRun again with --apply to write them.");
  await mongoose.disconnect();
  process.exit(0);
}

// Only `image` is touched. The model's pre-save hook derives slug, level and
// path, and a bare updateOne does not run it — which is exactly what is wanted
// here, since none of those depend on the picture.
let written = 0;
for (const { _id, url } of updates) {
  const res = await Categories.updateOne({ _id }, { $set: { image: url } });
  written += res.modifiedCount;
}
console.log(`\nwrote ${written} category images`);
console.log("The storefront caches categories for a few minutes — reload after that,");
console.log("or restart the backend to see it immediately.");

await mongoose.disconnect();
