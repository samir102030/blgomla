/**
 * Undo the category restructuring and the derived spec attributes, putting the
 * catalogue back the way the bulk upload left it.
 *
 *   node scripts/revertCategoryChanges.js --dry   # report, change nothing
 *   node scripts/revertCategoryChanges.js         # apply
 *
 * Reverses, in order:
 *   · groupSurveillanceCategories.js — the four ranges go back to top level and
 *     "Surveillance Systems" is removed
 *   · channelsToAttribute.js — "32/8/4 Channel" come back as categories and
 *     their products return to them; "NVR / DVR" is removed
 *   · deriveFilterAttributes.js — the Mega Pixel and Lens attributes are removed
 *
 * The retired demo catalogue is deliberately left retired — that was asked for
 * separately and is not part of this change.
 *
 * Products go back to the right channel category because the migration wrote
 * the count onto each product as `Channels`, so this reads it back off before
 * removing it. Nothing was ever hard-deleted, so no data has to be guessed at.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

const PARENT = "Surveillance Systems";
const RECORDERS = "NVR / DVR";
const MOVED_BACK_TO_TOP = ["IP Camera", "PTZ Camera", "Intercom"];
const ADDED_ATTRIBUTES = ["Channels", "Mega Pixel", "Lens"];

const dryRun = process.argv.includes("--dry");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/belgomla");
  console.log(`✅ Connected${dryRun ? " (dry run — nothing will be written)" : ""}\n`);

  // ── 1. Ranges back to top level ──────────────────────────────────────────
  for (const name of MOVED_BACK_TO_TOP) {
    const cat = await Category.findOne({ name, deleted: false });
    if (!cat || !cat.parentCategory) continue;
    console.log(`↑ ${name} back to a main category`);
    if (!dryRun) {
      cat.parentCategory = null;
      await cat.save();
    }
  }

  // ── 2. Channel categories restored, products returned ────────────────────
  const recorders = await Category.findOne({ name: RECORDERS });
  const channelCats = await Category.find({ name: /^\d+\s*channel$/i });

  const byCount = new Map();
  for (const cat of channelCats) {
    const count = /^(\d+)/.exec(cat.name)?.[1];
    if (count) byCount.set(count, cat);
    if (cat.deleted) {
      console.log(`↻ "${cat.name}" restored as a category`);
      if (!dryRun) {
        cat.deleted = false;
        cat.isActive = true;
        cat.parentCategory = null;
        await cat.save();
      }
    }
  }

  if (recorders) {
    const products = await Product.find({ category: recorders._id, deleted: false });
    for (const product of products) {
      const channels = (product.attributes || []).find(
        (a) => String(a?.name ?? "").toLowerCase() === "channels"
      )?.value;
      const target = channels ? byCount.get(String(channels)) : null;
      if (!target) {
        // No Channels value means this product was not one of the seven the
        // migration moved — leave it where it is rather than guess.
        console.log(`  ⚠️  "${product.name.slice(0, 50)}" has no Channels value — left in ${RECORDERS}`);
        continue;
      }
      console.log(`  ← ${product.name.slice(0, 50)} → ${target.name}`);
      if (!dryRun) {
        product.category = target._id;
        await product.save();
      }
    }
  }

  // ── 3. Categories this work created are removed ──────────────────────────
  for (const name of [PARENT, RECORDERS]) {
    const cat = await Category.findOne({ name, deleted: false });
    if (!cat) continue;
    const left = await Product.countDocuments({ category: cat._id, deleted: false });
    if (left > 0) {
      // Refuse rather than strand products in a category nothing links to.
      console.log(`  ⚠️  "${name}" still holds ${left} products — retiring instead of deleting`);
      if (!dryRun) {
        cat.deleted = true;
        cat.isActive = false;
        await cat.save();
      }
      continue;
    }
    console.log(`✕ "${name}" removed`);
    if (!dryRun) await Category.deleteOne({ _id: cat._id });
  }

  // ── 4. Derived attributes stripped ───────────────────────────────────────
  const lowered = ADDED_ATTRIBUTES.map((a) => a.toLowerCase());
  const carrying = await Product.find({ "attributes.name": { $in: ADDED_ATTRIBUTES } });
  console.log(`\n🧹 Removing ${ADDED_ATTRIBUTES.join(", ")} from ${carrying.length} products`);
  if (!dryRun) {
    for (const product of carrying) {
      product.attributes = (product.attributes || []).filter(
        (a) => !lowered.includes(String(a?.name ?? "").trim().toLowerCase())
      );
      await product.save();
    }
  }

  console.log(dryRun ? "\nDry run complete — nothing written." : "\n✅ Reverted.");
  console.log("   Restart the backend so the cached category list refreshes.");
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
