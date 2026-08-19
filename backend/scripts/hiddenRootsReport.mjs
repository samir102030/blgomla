/** Read-only: the roots currently kept out of the category bar, biggest first. */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

await mongoose.connect(process.env.MONGO_URI);

const cats = await Category.find({ deleted: { $ne: true } })
  .select("name slug parentCategory showInMenu")
  .lean();

const counts = new Map();
for (const row of await Product.aggregate([
  { $match: { deleted: { $ne: true } } },
  { $group: { _id: "$category", n: { $sum: 1 } } },
])) {
  if (row._id) counts.set(String(row._id), row.n);
}

const hiddenRoots = cats
  .filter((c) => !c.parentCategory && c.showInMenu === false)
  .map((c) => ({ name: c.name, slug: c.slug, products: counts.get(String(c._id)) || 0 }))
  .sort((a, b) => b.products - a.products);

console.log(`hidden roots: ${hiddenRoots.length}\n`);
console.log("top 25 by products — these are the ones a shopper cannot reach:\n");
for (const r of hiddenRoots.slice(0, 25)) {
  console.log(`  ${String(r.products).padStart(5)}  ${r.name.padEnd(34)} [${r.slug}]`);
}

const buried = hiddenRoots.filter((r) => r.products > 0).reduce((n, r) => n + r.products, 0);
console.log(`\nproducts sitting in a hidden root: ${buried}`);

await mongoose.disconnect();
