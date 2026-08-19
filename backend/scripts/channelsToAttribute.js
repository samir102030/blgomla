// One-off migration: turn the "N Channel" categories into a Channels attribute.
//
//   node scripts/channelsToAttribute.js --dry     # report, change nothing
//   node scripts/channelsToAttribute.js           # apply
//
// Products in those categories move to a single recorders category and gain
// `Channels: N`, which the products page filters on. The emptied categories are
// soft-deleted (`deleted: true`), so nothing is destroyed and the change can be
// undone by hand if a name turns out to be wrong.
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import {
  CHANNEL_ATTRIBUTE,
  channelCountFromName,
  withChannelAttribute,
} from "../utils/channelAttribute.js";

const TARGET = { name: "NVR / DVR", nameAr: "أجهزة تسجيل" };

const dryRun = process.argv.includes("--dry");

const run = async () => {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/belgomla";
  await mongoose.connect(uri);
  console.log(`✅ Connected${dryRun ? " (dry run — nothing will be written)" : ""}`);

  const categories = await Category.find({ deleted: false });
  const channelCats = categories
    .map((c) => ({ doc: c, channels: channelCountFromName(c.name) }))
    .filter((c) => c.channels);

  if (channelCats.length === 0) {
    console.log("Nothing to do — no channel-named categories found.");
    await mongoose.disconnect();
    return;
  }

  console.log(`\nChannel categories found: ${channelCats.length}`);
  for (const { doc, channels } of channelCats) {
    const count = await Product.countDocuments({ category: doc._id, deleted: false });
    console.log(`  ${doc.name} → ${CHANNEL_ATTRIBUTE}=${channels}  (${count} products)`);
  }

  // The destination. Matched by name so a re-run reuses it rather than making
  // a second one.
  let target = await Category.findOne({ name: TARGET.name, deleted: false });
  if (!target) {
    if (dryRun) {
      console.log(`\nWould create category "${TARGET.name}".`);
    } else {
      target = await Category.create({
        ...TARGET,
        isActive: true,
        deleted: false,
        description: "Network and digital video recorders. Channel count is a filter, not a category.",
      });
      console.log(`\n📁 Created category "${target.name}"`);
    }
  } else {
    console.log(`\n📁 Using existing category "${target.name}"`);
  }

  let moved = 0;
  for (const { doc, channels } of channelCats) {
    const products = await Product.find({ category: doc._id, deleted: false });
    for (const product of products) {
      product.attributes = withChannelAttribute(product.attributes, channels);
      if (target) product.category = target._id;
      if (!dryRun) await product.save();
      moved += 1;
    }
    if (!dryRun) {
      doc.deleted = true;
      doc.isActive = false;
      await doc.save();
    }
  }

  console.log(
    dryRun
      ? `\nWould move ${moved} products and retire ${channelCats.length} categories.`
      : `\n✅ Moved ${moved} products. Retired ${channelCats.length} categories.`
  );
  if (!dryRun) {
    console.log("   Restart the backend so the cached storefront category list refreshes.");
  }

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Migration failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
