/**
 * Tick the nine departments the strip already shows.
 *
 *   node scripts/seedBarDepartments.mjs           # report only
 *   node scripts/seedBarDepartments.mjs --apply   # write them
 *
 * `showInBar` arrives defaulting to false, so on the day it ships no category
 * has it and the strip falls back to the shortlist hard-coded in
 * CategoryNav.tsx — which is why nothing changes on deploy. But that fallback
 * is all-or-nothing: the moment somebody ticks one box the other eight
 * disappear, which is a confusing first move for whoever opens that screen,
 * and is exactly what happened.
 *
 * So this writes the current nine in. Afterwards the screen holds the real
 * list, ticking a tenth adds it rather than replacing nine, and the fallback is
 * never reached again. Safe to run at any point: it only ever adds.
 *
 * Matched on slug, the same key the hard-coded list uses: an id means nothing
 * to a person reading this, and a name is something an operator may rename.
 * A slug that matches nothing is reported rather than skipped quietly — that
 * is how you find out the bar has been pointing at a category that no longer
 * exists.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Category from "../models/category.model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const apply = process.argv.includes("--apply");

// The order here is only the order they are reported in; the strip itself
// reads `sortOrder`, which the storefront visibility screen arranges.
const SLUGS = [
  "electronics",
  "computers-laptops",
  "storage",
  "networking",
  "surveillance-security",
  "printing-scanning",
  "point-of-sale-pos",
  "gaming-consoles-games",
  "telephony-conferencing",
];

await mongoose.connect(process.env.MONGO_URI);

/*
  Additive, not all-or-nothing.

  This used to refuse the moment anything was ticked, on the reasoning that the
  screen was then in charge. In practice the first thing that happens is
  somebody ticks one box to see what it does — and that is precisely the state
  where the other eight vanish from the strip and this script is most wanted.
  Refusing there left the only way out as ticking eight boxes by hand in a list
  of three hundred and forty-seven.

  So it adds the ones that are missing and leaves everything else exactly as it
  is. It never unticks anything, which is what makes running it twice safe.
*/
const already = await Category.countDocuments({
  showInBar: true,
  deleted: { $ne: true },
});
if (already) console.log(`${already} already on the strip — those are left alone.\n`);

const missing = [];
const found = [];
for (const slug of SLUGS) {
  const category = await Category.findOne({ slug, deleted: { $ne: true } })
    .select("_id name slug sortOrder showInBar")
    .lean();
  if (!category) {
    missing.push(slug);
    continue;
  }
  found.push(category);
}

for (const c of found) {
  console.log(`  ${String(c.sortOrder ?? 0).padStart(4)}  ${c.slug.padEnd(26)} ${c.name}`);
}
if (missing.length) {
  console.log(`\nNo category with these slugs: ${missing.join(", ")}`);
}
console.log(`\n${found.length} of ${SLUGS.length} matched.`);

if (!apply) {
  console.log("\nReport only — pass --apply to write.");
  await mongoose.disconnect();
  process.exit(0);
}

const result = await Category.updateMany(
  { _id: { $in: found.map((c) => c._id) }, showInBar: { $ne: true } },
  { $set: { showInBar: true } }
);
console.log(
  `\nPut ${result.modifiedCount} departments on the strip` +
    (found.length - result.modifiedCount
      ? ` (${found.length - result.modifiedCount} were already there).`
      : ".")
);
console.log("Arrange them at: Admin → Storefront visibility → Categories");

await mongoose.disconnect();
