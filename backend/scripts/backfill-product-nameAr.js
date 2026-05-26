/**
 * Backfill Product.nameAr for products whose English name leads with a
 * translatable descriptive word (e.g. "Rack 42U (80x100) [SKU]"). The vast
 * majority of products are pure brand+model SKUs (Hikvision DS-…, TP-Link
 * TL-…) — those are conventionally kept in Latin script even on Arabic
 * storefronts in Egypt, so we leave their nameAr empty and let the frontend
 * fallback (`nameAr || name`) display the English label.
 *
 * Idempotent — only writes when nameAr is missing/empty.
 *
 * Usage:
 *   node scripts/backfill-product-nameAr.js            # apply
 *   node scripts/backfill-product-nameAr.js --dry-run  # report only
 */
import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/product.model.js";

const DRY_RUN = process.argv.includes("--dry-run");

// Leading-word substitutions, applied to the very start of the name.
// Order matters: more specific patterns first.
const LEADING_RULES = [
  [/^Rack\b/i, "خزانة"],
];

const translate = (name) => {
  if (!name) return null;
  for (const [pattern, ar] of LEADING_RULES) {
    if (pattern.test(name)) return name.replace(pattern, ar);
  }
  return null;
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI missing in .env");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected (${DRY_RUN ? "DRY-RUN" : "APPLY"})`);

  const products = await Product.find({
    $or: [
      { nameAr: { $exists: false } },
      { nameAr: "" },
      { nameAr: null },
    ],
  })
    .select("_id name nameAr")
    .lean();

  let updated = 0;
  let skipped = 0;

  for (const p of products) {
    const ar = translate(p.name);
    if (!ar) {
      skipped++;
      continue;
    }
    if (!DRY_RUN) {
      await Product.updateOne({ _id: p._id }, { $set: { nameAr: ar } });
    }
    updated++;
    console.log(`  ✓ ${p.name}  →  ${ar}`);
  }

  console.log(`\n${DRY_RUN ? "Would update" : "Updated"}: ${updated}`);
  console.log(`Skipped (no rule matched — frontend falls back to name): ${skipped}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
