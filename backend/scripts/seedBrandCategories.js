/**
 * Give every brand the categories it belongs on.
 *
 *   node scripts/seedBrandCategories.js --dry   # report only
 *   node scripts/seedBrandCategories.js         # apply
 *
 * Two sources, unioned:
 *
 *   1. The products themselves — a brand belongs to a category when something
 *      of that brand is filed there. This is the authoritative half.
 *   2. The curated map below, for brands that carry no products yet. Fifteen of
 *      sixteen brands are in that state today, so deriving from products alone
 *      leaves the brand filter with nothing to narrow.
 *
 * The union is what makes it safe to re-run: seeded links survive the first
 * real product landing, and real products keep adding categories the map never
 * anticipated. Note that `linkBrandsCategories.js` recomputes purely from
 * products and will drop the curated half — run this one instead, or run that
 * one first and this one after.
 *
 * Categories are named by slug rather than id so the map stays readable and
 * survives a reseed. A slug that no longer resolves is reported, not skipped
 * silently — a filter quietly missing a brand is the failure this exists to
 * prevent. Soft-deleted categories are refused for the same reason: linking a
 * brand to a shelf no customer can reach is worse than not linking it.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Brand from "../models/brand.model.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

const dryRun = process.argv.includes("--dry");

/**
 * brand name → category slugs.
 *
 * Deliberately the leaves, not the departments: the filter panel ticks a parent
 * and the server walks down, so linking ASUS to `laptop` would be broader than
 * the truth and no more useful. Brands whose only categories are soft-deleted
 * (the camera tree) are listed with what survives, which for Nikon is nothing.
 */
const BRAND_CATEGORIES = {
  AMD: ["processors", "graphics-cards"],
  ASUS: [
    "gaming-laptops",
    "business-laptops",
    "personal-laptops",
    "motherboards",
    "graphics-cards",
    "monitors",
    "modem-router",
    "wifi-router-access-point",
  ],
  Apple: ["personal-laptops", "pc-all-in-one", "monitors"],
  Canon: ["laser-printers", "inkjet-printers", "scanners"],
  Corsair: [
    "ram-memory",
    "power-supplies",
    "pc-cases-cooling",
    "keyboards-mice",
    "headsets-speakers",
  ],
  Dell: [
    "business-laptops",
    "personal-laptops",
    "gaming-laptops",
    "pc-all-in-one",
    "monitors",
  ],
  HP: [
    "business-laptops",
    "personal-laptops",
    "pc-all-in-one",
    "monitors",
    "laser-printers",
    "inkjet-printers",
    "scanners",
  ],
  Hikvision: [
    "ip-camera",
    "cctv-hd-camera",
    "ptz-camera",
    "intercom",
    "access-control",
    "sound-system",
  ],
  Lenovo: [
    "business-laptops",
    "personal-laptops",
    "gaming-laptops",
    "pc-all-in-one",
    "monitors",
  ],
  Logitech: ["keyboards-mice", "headsets-speakers", "computer-accessories"],
  MSI: ["gaming-laptops", "motherboards", "graphics-cards", "monitors"],
  NVIDIA: ["graphics-cards"],
  // Every camera category this brand belongs to is soft-deleted. Left empty on
  // purpose rather than filed somewhere it does not sell.
  Nikon: [],
  Samsung: [
    "monitors",
    "internal-storage",
    "external-storage",
    "memory-cards-flash",
    "tv-displays",
    "personal-laptops",
  ],
  Sony: ["tv-displays", "headsets-speakers"],
  "TP-Link": [
    "modem-router",
    "wifi-router-access-point",
    "switches",
    "poe-switches",
    "unmanaged-switches",
    "managed-switches",
    "network-storage",
    "pci-cards-usb-adapters",
  ],
};

async function main() {
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/belgomla"
  );
  console.log(`Connected${dryRun ? " (dry run — nothing will be written)" : ""}\n`);

  const categories = await Category.find({}).select("name slug deleted").lean();
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const nameById = new Map(categories.map((c) => [String(c._id), c.name]));

  // Resolve the whole map before touching anything, so a typo is a report at
  // the top rather than a half-applied run.
  const unresolved = [];
  const deleted = [];
  const resolved = new Map();
  for (const [brandName, slugs] of Object.entries(BRAND_CATEGORIES)) {
    const ids = [];
    for (const slug of slugs) {
      const category = bySlug.get(slug);
      if (!category) {
        unresolved.push(`${brandName} → ${slug}`);
        continue;
      }
      if (category.deleted) {
        deleted.push(`${brandName} → ${slug}`);
        continue;
      }
      ids.push(String(category._id));
    }
    resolved.set(brandName, ids);
  }

  if (unresolved.length) {
    console.log(`⚠️  ${unresolved.length} slug(s) not found — skipped:`);
    unresolved.forEach((u) => console.log(`     ${u}`));
    console.log("");
  }
  if (deleted.length) {
    console.log(`⚠️  ${deleted.length} slug(s) point at deleted categories — skipped:`);
    deleted.forEach((d) => console.log(`     ${d}`));
    console.log("");
  }

  const brands = await Brand.find({ deleted: { $ne: true } });
  let changed = 0;
  let unchanged = 0;
  let unmapped = 0;

  for (const brand of brands) {
    const seeded = resolved.get(brand.name);
    if (seeded === undefined) {
      // A brand nobody mapped and nothing sells under: say so rather than
      // leaving it to be noticed later as a gap in the filter.
      if (!(await Product.countDocuments({ brand: brand._id, deleted: false }))) {
        console.log(`  ${brand.name} — not in the map and has no products, left alone`);
        unmapped += 1;
        continue;
      }
    }

    const fromProducts = (
      await Product.distinct("category", { brand: brand._id, deleted: false })
    ).filter(Boolean);

    const next = [...new Set([...(seeded || []), ...fromProducts.map(String)])];
    const before = (brand.categories || []).map(String).sort().join(",");
    const after = [...next].sort().join(",");

    if (before === after) {
      unchanged += 1;
      continue;
    }

    const added = next.filter((id) => !(brand.categories || []).map(String).includes(id));
    console.log(
      `  ${brand.name.padEnd(12)} ${next.length} categories` +
        (added.length
          ? ` (+${added.length}: ${added.map((id) => nameById.get(id) || "?").join(", ")})`
          : "")
    );
    changed += 1;

    if (!dryRun) {
      brand.categories = next;
      await brand.save();
    }
  }

  console.log(
    `\n${dryRun ? "Would update" : "Updated"} ${changed} brand(s) — ` +
      `${unchanged} already correct, ${unmapped} left alone.`
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
