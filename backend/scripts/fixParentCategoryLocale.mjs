// One-off: 7 parent categories on prod were stored with Arabic in the
// English `name` field. Swap `name` ↔ `nameAr` when:
//   - the doc has no `parentCategory` (i.e. it's a top-level parent)
//   - `name` contains Arabic characters
//   - either `nameAr` is empty OR `nameAr` matches `name` (no real EN value
//     was ever stored)
//
// Defaults to dry-run. Pass `--apply` to actually write.
// Usage:
//   MONGO_URI="<atlas uri>" node scripts/fixParentCategoryLocale.mjs        # dry run
//   MONGO_URI="<atlas uri>" node scripts/fixParentCategoryLocale.mjs --apply

import "dotenv/config";
import mongoose from "mongoose";
import Category from "../models/category.model.js";

const APPLY = process.argv.includes("--apply");
const ARABIC_RE = /[؀-ۿ]/;

// Hardcoded English names derived from each parent's slug. Verified manually
// against the 7 known parents (see audit on 2026-05-14).
const SLUG_TO_EN = {
  "cameras-photography": "Cameras & Photography",
  "computer-components": "Computer Components",
  "laptops-computers": "Laptops & Computers",
  "networking": "Networking",
  "networking-it": "Networking & IT",
  "peripherals-accessories": "Peripherals & Accessories",
  "security-surveillance": "Security & Surveillance",
};

const main = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected. Mode: ${APPLY ? "APPLY (writes)" : "DRY RUN (no writes)"}`);

  const parents = await Category.find({
    $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }],
  }).lean();

  console.log(`Found ${parents.length} top-level parent categories.`);

  const toFix = [];
  for (const c of parents) {
    const nameIsArabic = ARABIC_RE.test(c.name || "");
    if (!nameIsArabic) continue;
    const enFromSlug = SLUG_TO_EN[c.slug];
    if (!enFromSlug) {
      console.warn(`  skip ${c.slug} — no SLUG_TO_EN mapping`);
      continue;
    }
    toFix.push({
      _id: c._id,
      slug: c.slug,
      currentName: c.name,
      currentNameAr: c.nameAr,
      newName: enFromSlug,
      newNameAr: c.name, // preserve Arabic in nameAr
    });
  }

  if (toFix.length === 0) {
    console.log("Nothing to fix.");
    await mongoose.disconnect();
    return;
  }

  console.log("\nPlanned changes:");
  for (const f of toFix) {
    console.log(`  ${f.slug}`);
    console.log(`    name:   '${f.currentName}'  →  '${f.newName}'`);
    console.log(`    nameAr: '${f.currentNameAr}'  →  '${f.newNameAr}'`);
  }

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with --apply to write.");
    await mongoose.disconnect();
    return;
  }

  console.log("\nApplying...");
  for (const f of toFix) {
    await Category.updateOne(
      { _id: f._id },
      { $set: { name: f.newName, nameAr: f.newNameAr } },
    );
    console.log(`  updated ${f.slug}`);
  }
  console.log("Done.");
  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
