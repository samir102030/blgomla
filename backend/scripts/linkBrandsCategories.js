/**
 * Link every brand to the categories it actually sells in, derived from the
 * products that carry it. Safe to re-run — it recomputes from scratch.
 *
 *   node scripts/linkBrandsCategories.js --dry   # report only
 *   node scripts/linkBrandsCategories.js         # apply
 *
 * Previously this read `p.Category`. The field was renamed to `category` long
 * ago, so every product yielded undefined, the id list was always empty, and
 * the `if (categoryIds.length > 0)` guard skipped the save — the script
 * reported nothing and wrote nothing. It also never cleared a stale link, so a
 * brand kept categories it had stopped selling in.
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

async function main() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/belgomla");
  console.log(`✅ Connected${dryRun ? " (dry run — nothing will be written)" : ""}\n`);

  const categoryName = new Map(
    (await Category.find({}).select("name").lean()).map((c) => [String(c._id), c.name])
  );

  const brands = await Brand.find({ deleted: false });
  let linked = 0;
  let cleared = 0;

  for (const brand of brands) {
    // One trip per brand, and only the ids — `distinct` does the dedupe.
    const categoryIds = (
      await Product.distinct("category", { brand: brand._id, deleted: false })
    ).filter(Boolean);

    const before = (brand.categories || []).map(String).sort().join(",");
    const after = categoryIds.map(String).sort().join(",");
    if (before === after) continue;

    const names = categoryIds.map((id) => categoryName.get(String(id)) || "?");
    if (categoryIds.length) {
      console.log(`  ${brand.name} → ${names.join(", ")}`);
      linked += 1;
    } else {
      // A brand with no live products keeps no categories. Leaving the old
      // ones would show it on shelves it no longer stocks.
      console.log(`  ${brand.name} → (no products — link cleared)`);
      cleared += 1;
    }

    if (!dryRun) {
      brand.categories = categoryIds;
      await brand.save();
    }
  }

  console.log(
    `\n${dryRun ? "Would update" : "Updated"} ${linked + cleared} brands — ${linked} linked, ${cleared} cleared.`
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
