/**
 * Backfill Product.descriptionAr from the curated EN→AR map in
 * scripts/data/product-descriptions-ar.json.
 *
 * Idempotent — only writes when descriptionAr is empty/missing. Matches the
 * product's English `description` against the map by exact string first, then
 * by a whitespace-normalized key (handles stray newlines / trailing spaces).
 *
 * Usage:
 *   node scripts/backfill-product-descriptionAr.js            # apply
 *   node scripts/backfill-product-descriptionAr.js --dry-run  # report only
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Product from "../models/product.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");

const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI missing");
    process.exit(1);
  }

  const mapPath = path.join(__dirname, "data", "product-descriptions-ar.json");
  const rawMap = JSON.parse(fs.readFileSync(mapPath, "utf8"));

  // Build a normalized lookup so trivial whitespace differences still match.
  const lookup = new Map();
  for (const [en, ar] of Object.entries(rawMap)) {
    if (ar && ar.trim()) lookup.set(norm(en), ar);
  }
  console.log(`Loaded ${lookup.size} EN→AR translations`);

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected (${DRY_RUN ? "DRY-RUN" : "APPLY"})`);

  const products = await Product.find({
    $or: [
      { descriptionAr: { $exists: false } },
      { descriptionAr: "" },
      { descriptionAr: null },
    ],
  })
    .select("_id name description descriptionAr")
    .lean();

  let updated = 0;
  let skipped = 0;
  const unmapped = new Map(); // normalized desc -> count

  for (const p of products) {
    const ar = lookup.get(norm(p.description));
    if (!ar) {
      if (p.description && p.description.trim()) {
        unmapped.set(
          p.description,
          (unmapped.get(p.description) || 0) + 1
        );
      } else {
        skipped++; // no English source to translate from
      }
      continue;
    }
    if (DRY_RUN) {
      updated++;
      continue;
    }
    await Product.updateOne({ _id: p._id }, { $set: { descriptionAr: ar } });
    updated++;
  }

  console.log(`\n${DRY_RUN ? "Would update" : "Updated"}: ${updated}`);
  console.log(`Skipped (no EN description): ${skipped}`);
  if (unmapped.size) {
    console.log(`\nUNMAPPED (${unmapped.size} unique) — add to the map:`);
    for (const [desc, n] of [...unmapped.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${n}x  ${JSON.stringify(desc)}`);
    }
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
