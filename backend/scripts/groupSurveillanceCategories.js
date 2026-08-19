// One-off: gather the surveillance range under a single main category, and
// retire the demo catalogue that the seed script left behind.
//
//   node scripts/groupSurveillanceCategories.js --dry    # report only
//   node scripts/groupSurveillanceCategories.js          # apply
//
// "IP Camera", "PTZ Camera", "NVR / DVR" and "Intercom" stop being top-level
// shelves and become children of one parent, so a shopper meets the range as
// one thing and narrows down inside it. Products are untouched: each keeps the
// category it already has, which is now a subcategory. The storefront filter
// already walks a parent's descendants, so picking the parent shows all of it.
//
// Nothing is destroyed. Retiring sets `deleted: true`, which is what the rest
// of the app filters on, so every step here is reversible by flipping it back.
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

const PARENT = { name: "Surveillance Systems", nameAr: "أنظمة المراقبة" };

// Moved under the parent, in the order they should read on the storefront.
const CHILDREN = ["IP Camera", "PTZ Camera", "NVR / DVR", "Intercom"];

// Seeded sample data — not this shop's catalogue. Their subcategories and the
// products inside go with them.
const DEMO_ROOTS = [
  "Laptops & Computers",
  "Cameras & Photography",
  "Computer Components",
  "Networking & IT",
  "Peripherals & Accessories",
];

const dryRun = process.argv.includes("--dry");
const say = (msg) => console.log(msg);

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/belgomla");
  say(`✅ Connected${dryRun ? " (dry run — nothing will be written)" : ""}\n`);

  // ── 1. The parent ────────────────────────────────────────────────────────
  let parent = await Category.findOne({ name: PARENT.name, deleted: false });
  if (!parent) {
    if (dryRun) {
      say(`Would create main category "${PARENT.name}".`);
    } else {
      parent = await Category.create({
        ...PARENT,
        isActive: true,
        deleted: false,
        description: "Cameras, recorders and intercom — the full surveillance range.",
      });
      say(`📁 Created main category "${parent.name}"`);
    }
  } else {
    say(`📁 Using existing main category "${parent.name}"`);
  }

  // ── 2. Move the ranges under it ──────────────────────────────────────────
  for (const name of CHILDREN) {
    const cat = await Category.findOne({ name, deleted: false });
    if (!cat) {
      say(`  ⚠️  "${name}" not found — skipped`);
      continue;
    }
    const count = await Product.countDocuments({ category: cat._id, deleted: false });
    if (parent && String(cat.parentCategory ?? "") === String(parent._id)) {
      say(`  = ${name} (${count} products) — already under the parent`);
      continue;
    }
    say(`  → ${name} (${count} products) becomes a subcategory`);
    if (!dryRun && parent) {
      cat.parentCategory = parent._id;
      await cat.save(); // save(), not updateOne: the hook recomputes `path`
    }
  }

  // ── 3. Retire the seeded demo catalogue ──────────────────────────────────
  say("\nDemo data:");
  let demoProducts = 0;
  let demoCats = 0;
  for (const rootName of DEMO_ROOTS) {
    const root = await Category.findOne({ name: rootName, deleted: false });
    if (!root) continue;
    const subs = await Category.find({ parentCategory: root._id, deleted: false });
    const ids = [root._id, ...subs.map((s) => s._id)];
    const count = await Product.countDocuments({ category: { $in: ids }, deleted: false });
    say(`  ${rootName} + ${subs.length} subcategories → ${count} products`);
    demoProducts += count;
    demoCats += ids.length;
    if (!dryRun) {
      await Product.updateMany({ category: { $in: ids } }, { $set: { deleted: true, isActive: false } });
      await Category.updateMany({ _id: { $in: ids } }, { $set: { deleted: true, isActive: false } });
    }
  }

  say(
    dryRun
      ? `\nWould retire ${demoProducts} demo products and ${demoCats} demo categories.`
      : `\n✅ Retired ${demoProducts} demo products and ${demoCats} demo categories.`
  );
  if (!dryRun) say("   Restart the backend so the cached category list refreshes.");

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
