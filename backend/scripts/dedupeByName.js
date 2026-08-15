/**
 * Collapse categories or brands that share a name down to one record.
 *
 * Both collections carry a unique index on `name` today, so a fresh database
 * cannot grow duplicates. A database that predates the index, or one filled by
 * import, can still hold them — and once it does, half the products point at
 * one copy and half at the other, so the catalogue looks like it is missing
 * items that are really just filed under the twin.
 *
 * Deleting the extra copy on its own would orphan everything pointing at it.
 * So this repoints first and deletes second, and it prefers keeping the copy
 * that already has the most attached to it — the one whose removal would
 * disturb the most.
 *
 *   node scripts/dedupeByName.js categories --dry-run
 *   node scripts/dedupeByName.js brands
 *   node scripts/dedupeByName.js all --dry-run
 */
import "dotenv/config";
import mongoose from "mongoose";
import Category from "../models/category.model.js";
import Brand from "../models/brand.model.js";
import Product from "../models/product.model.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const target = args.find((a) => !a.startsWith("--")) || "all";

const die = (m) => {
  console.error(`\n  ✗ ${m}\n`);
  process.exit(1);
};

const KINDS = {
  categories: { Model: Category, field: "category", label: "قسم" },
  brands: { Model: Brand, field: "brand", label: "ماركة" },
};

if (target !== "all" && !KINDS[target]) {
  die("Usage: node scripts/dedupeByName.js <categories|brands|all> [--dry-run]");
}
if (!process.env.MONGO_URI) die("MONGO_URI is not set.");

await mongoose.connect(process.env.MONGO_URI);
console.log(
  `\n  ${mongoose.connection.name}${dryRun ? "   (تجربة — مش هيتكتب حاجة)" : ""}\n`
);

const dedupe = async (kind) => {
  const { Model, field, label } = KINDS[kind];
  const rows = await Model.find({ deleted: { $ne: true } })
    .select("name createdAt")
    .lean();

  const groups = new Map();
  for (const r of rows) {
    const key = String(r.name || "").trim().toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const dupes = [...groups.values()].filter((g) => g.length > 1);
  if (dupes.length === 0) {
    console.log(`  ${kind}: مفيش أسماء مكررة ✅`);
    return;
  }

  console.log(`  ${kind}: ${dupes.length} اسم مكرر`);

  for (const group of dupes) {
    // Count what hangs off each copy, then keep the busiest. Ties break on
    // age: the original is the one people have linked to elsewhere.
    const counted = [];
    for (const doc of group) {
      const products = await Product.countDocuments({
        [field]: doc._id,
        deleted: { $ne: true },
      });
      const children =
        kind === "categories"
          ? await Category.countDocuments({
              parentCategory: doc._id,
              deleted: { $ne: true },
            })
          : 0;
      counted.push({ doc, products, children });
    }
    counted.sort(
      (a, b) =>
        b.products + b.children - (a.products + a.children) ||
        new Date(a.doc.createdAt) - new Date(b.doc.createdAt)
    );

    const [keep, ...remove] = counted;
    console.log(
      `\n    "${keep.doc.name}" — هيفضل ${String(keep.doc._id).slice(-8)} ` +
        `(${keep.products} منتج${keep.children ? `، ${keep.children} فرعي` : ""})`
    );

    for (const extra of remove) {
      console.log(
        `      يشيل ${String(extra.doc._id).slice(-8)} ` +
          `(${extra.products} منتج${extra.children ? `، ${extra.children} فرعي` : ""})`
      );
      if (dryRun) continue;

      if (extra.products) {
        await Product.updateMany(
          { [field]: extra.doc._id },
          { $set: { [field]: keep.doc._id } }
        );
      }
      if (kind === "categories" && extra.children) {
        await Category.updateMany(
          { parentCategory: extra.doc._id },
          { $set: { parentCategory: keep.doc._id } }
        );
      }
      // Soft delete, not a hard removal: if the wrong copy was ever kept, the
      // record and its id are still there to put back.
      await KINDS[kind].Model.updateOne(
        { _id: extra.doc._id },
        { $set: { deleted: true, isActive: false } }
      );
    }
  }
};

for (const kind of target === "all" ? Object.keys(KINDS) : [target]) {
  await dedupe(kind);
}

console.log(
  dryRun ? "\n  تجربة — مفيش حاجة اتغيرت.\n" : "\n  خلص.\n"
);
await mongoose.disconnect();
