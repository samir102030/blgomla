/** Read-only: does a product in a brand-named category already carry that brand? */
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

await mongoose.connect(process.env.MONGO_URI);

const brands = await Brand.find({ deleted: { $ne: true } }).select("name").lean();
const byNorm = new Map(brands.map((b) => [normalize(b.name), b]));
const cats = await Category.find({ deleted: { $ne: true } }).select("name").lean();
const hits = cats.filter((c) => byNorm.has(normalize(c.name)));

let correct = 0;
let missing = 0;
let other = 0;
for (const c of hits) {
  const brand = byNorm.get(normalize(c.name));
  const rows = await Product.find({ category: c._id, deleted: { $ne: true } })
    .select("brand")
    .lean();
  for (const p of rows) {
    if (!p.brand) missing += 1;
    else if (String(p.brand) === String(brand._id)) correct += 1;
    else other += 1;
  }
}

console.log("products sitting in a brand-named category:");
console.log(`  brand already set correctly : ${correct}`);
console.log(`  brand missing entirely      : ${missing}`);
console.log(`  brand set to something else : ${other}`);
await mongoose.disconnect();
