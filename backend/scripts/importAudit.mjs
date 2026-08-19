/** Read-only: what arrived with the import, separated from what was here before. */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Brand from "../models/brand.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";

await mongoose.connect(process.env.MONGO_URI);

const day = (d) => new Date(d).toISOString().slice(0, 10);

for (const [label, Model] of [
  ["products", Product],
  ["categories", Category],
  ["brands", Brand],
]) {
  const rows = await Model.find({}).select("createdAt").lean();
  const byDay = new Map();
  for (const r of rows) {
    const k = r.createdAt ? day(r.createdAt) : "(no date)";
    byDay.set(k, (byDay.get(k) || 0) + 1);
  }
  console.log(`\n${label}: ${rows.length}`);
  for (const [d, n] of [...byDay.entries()].sort()) {
    console.log(`   ${d}  ${String(n).padStart(6)}`);
  }
}

// The one thing that must not be collateral: anything a customer has bought.
const orders = await Order.countDocuments({});
const orderedIds = await Order.distinct("items.product");
console.log(`\norders in the system: ${orders}`);
console.log(`distinct products referenced by an order: ${orderedIds.filter(Boolean).length}`);

await mongoose.disconnect();
