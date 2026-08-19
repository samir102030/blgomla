/**
 * Report categories that are really brands.
 *
 *   node scripts/findBrandCategories.mjs
 *
 * Read-only. An import filed manufacturers as departments — "ACER", "HIKVISION",
 * "TP-Link" are roots in the category tree beside "Printers" and "Network" —
 * and the products under them therefore have a brand where their category
 * should be. This finds them and says what moving each one would cost, because
 * a product carries exactly one category: emptying "ACER" leaves its products
 * with none unless something else is put there.
 */
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
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

async function main() {
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/belgomla"
  );

  const [brands, categories] = await Promise.all([
    Brand.find({ deleted: { $ne: true } }).select("name").lean(),
    Category.find({ deleted: { $ne: true } })
      .select("name slug parentCategory")
      .lean(),
  ]);

  const brandByNorm = new Map(brands.map((b) => [normalize(b.name), b]));

  const counts = new Map();
  for (const row of await Product.aggregate([
    { $match: { deleted: { $ne: true } } },
    { $group: { _id: "$category", n: { $sum: 1 } } },
  ])) {
    if (row._id) counts.set(String(row._id), row.n);
  }

  // Which categories carry a brand's name. Only an exact normalized match is
  // reported — guessing from substrings would sweep up "Printer Barcode" for a
  // brand called "Barcode" and move products nobody asked to move.
  const hits = categories
    .map((c) => ({
      category: c,
      brand: brandByNorm.get(normalize(c.name)) || null,
      products: counts.get(String(c._id)) || 0,
    }))
    .filter((h) => h.brand);

  const withProducts = hits.filter((h) => h.products > 0);
  const totalProducts = hits.reduce((sum, h) => sum + h.products, 0);

  console.log(`brands in the catalogue:            ${brands.length}`);
  console.log(`categories:                         ${categories.length}`);
  console.log(`categories whose name IS a brand:   ${hits.length}`);
  console.log(`  …of those, holding products:      ${withProducts.length}`);
  console.log(`products filed under one:           ${totalProducts}\n`);

  for (const h of hits.sort((a, b) => b.products - a.products)) {
    console.log(
      `  ${h.category.name.padEnd(24)} ${String(h.products).padStart(5)} products` +
        (h.category.parentCategory ? "  (a subcategory)" : "  (a root)")
    );
  }

  // The part that has to be decided before anything moves.
  console.log(
    `\nMoving these to Brand would leave ${totalProducts} products with no category,` +
      `\nunless each is also given one. Nothing has been changed.`
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
