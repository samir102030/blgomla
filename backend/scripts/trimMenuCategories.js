/**
 * Keep the category bar to the shop's own departments.
 *
 *   node scripts/trimMenuCategories.js --dry   # report only
 *   node scripts/trimMenuCategories.js         # apply
 *
 * An import added a hundred and fifty-odd flat categories as roots. Every root
 * goes in the storefront's category bar, so the bar became a twelve-row wall of
 * names above every page. The departments below are the ones the shop was built
 * around — they are the only roots with subcategories under them.
 *
 * Nothing is deleted and nothing is unfiled. `showInMenu` is the flag the
 * Category model already keeps for exactly this: "live and browsable" and
 * "listed in the menu" are separate decisions. Hidden categories still hold
 * their products, still filter, and still appear in the filter panel on the
 * products page — that panel is a filter, not a menu, and reads `isActive`
 * rather than this flag.
 *
 * Re-runnable: it sets the flag on every category each time, so a later import
 * is trimmed by running it again.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Category from "../models/category.model.js";

const dryRun = process.argv.includes("--dry");

/** The departments that stay in the bar, by slug. */
const MENU_ROOTS = [
  "computer",
  "laptop",
  "security-surveillance",
  "network",
  "printers",
  "cashier-systems",
  "uninterruptible-power-supply-ups",
  "office-solution",
  "accessories",
];

async function main() {
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/belgomla"
  );
  console.log(`Connected${dryRun ? " (dry run — nothing will be written)" : ""}\n`);

  const all = await Category.find({ deleted: { $ne: true } })
    .select("name nameAr slug parentCategory showInMenu")
    .lean();

  const bySlug = new Map(all.map((c) => [c.slug, c]));
  const childrenOf = new Map();
  for (const c of all) {
    if (!c.parentCategory) continue;
    const parent = String(c.parentCategory);
    childrenOf.set(parent, [...(childrenOf.get(parent) || []), String(c._id)]);
  }

  const missing = MENU_ROOTS.filter((slug) => !bySlug.has(slug));
  if (missing.length) {
    console.log(`⚠️  not found, skipped: ${missing.join(", ")}\n`);
  }

  // A department's subcategories are part of the menu with it — hiding them
  // would leave a root that opens onto nothing.
  const keep = new Set();
  const queue = MENU_ROOTS.filter((slug) => bySlug.has(slug)).map((slug) =>
    String(bySlug.get(slug)._id)
  );
  while (queue.length) {
    const id = queue.shift();
    if (keep.has(id)) continue;
    keep.add(id);
    queue.push(...(childrenOf.get(id) || []));
  }

  const shown = [];
  const hidden = [];
  for (const c of all) {
    const shouldShow = keep.has(String(c._id));
    if ((c.showInMenu !== false) === shouldShow) continue;
    (shouldShow ? shown : hidden).push(c);
  }

  console.log(`departments kept in the bar (${MENU_ROOTS.length - missing.length}):`);
  for (const slug of MENU_ROOTS) {
    const c = bySlug.get(slug);
    if (!c) continue;
    const kids = (childrenOf.get(String(c._id)) || []).length;
    console.log(`  ${c.name.padEnd(36)} ${kids} subcategories`);
  }

  console.log(`\nto hide from the bar: ${hidden.length}`);
  for (const c of hidden.slice(0, 10)) console.log(`  ${c.name}`);
  if (hidden.length > 10) console.log(`  … and ${hidden.length - 10} more`);
  if (shown.length) console.log(`\nto restore to the bar: ${shown.length}`);

  if (!dryRun && (hidden.length || shown.length)) {
    if (hidden.length) {
      await Category.updateMany(
        { _id: { $in: hidden.map((c) => c._id) } },
        { $set: { showInMenu: false } }
      );
    }
    if (shown.length) {
      await Category.updateMany(
        { _id: { $in: shown.map((c) => c._id) } },
        { $set: { showInMenu: true } }
      );
    }
  }

  const inMenu = await Category.countDocuments({
    deleted: { $ne: true },
    isActive: { $ne: false },
    showInMenu: { $ne: false },
    parentCategory: null,
  });
  console.log(
    `\n${dryRun ? "Would leave" : "Left"} ${dryRun ? MENU_ROOTS.length - missing.length : inMenu} roots in the bar.`
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
