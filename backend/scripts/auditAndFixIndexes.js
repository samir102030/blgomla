/**
 * Phase 4 #15 — Index audit & fix.
 *
 * Reads $indexStats across products/brands/categories/orders/users and
 * applies the drops we're confident about. Run against whichever DB
 * backend/.env points at.
 *
 * Confident drops:
 *   - products.category_1_brand_1_price_1
 *       Leftover from a legacy filter combo (category AND brand AND price).
 *       Current controllers filter on { category } OR { brand } standalone,
 *       backed by { category, createdAt } and { brand, createdAt }. This
 *       compound has 0 ops since restore and is supplanted.
 *
 * Kept-but-flagged (see report below):
 *   - products.createdAt_-1               — redundant with every compound
 *                                            that has createdAt as suffix,
 *                                            but serves the unfiltered
 *                                            "newest" query. Keep.
 *   - products.isActive_1_deleted_1_approvalStatus_1
 *                                          — useful baseline filter, even if
 *                                            $indexStats hasn't seen it pick
 *                                            this one (planner often prefers
 *                                            the more selective compound).
 *                                            Keep.
 *   - all uniqueness indexes (name_1, slug_1, sku_1, email_1)
 *                                          — back constraints, must keep.
 *
 * Run:  node backend/scripts/auditAndFixIndexes.js [--apply]
 *   default = report only; --apply executes drops.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const APPLY = process.argv.includes("--apply");

const DROPS = [
  { collection: "products", index: "category_1_brand_1_price_1" },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  console.log(`✅ Connected to ${db.databaseName}`);
  console.log(APPLY ? "🛠  Apply mode\n" : "🔎 Report only (pass --apply to drop)\n");

  for (const cname of ["products", "brands", "categories", "orders", "users"]) {
    const col = db.collection(cname);
    const [indexes, stats] = await Promise.all([
      col.indexes(),
      col.aggregate([{ $indexStats: {} }]).toArray(),
    ]);
    const byName = Object.fromEntries(stats.map((s) => [s.name, s]));
    console.log(`========== ${cname} (${indexes.length} indexes) ==========`);
    for (const idx of indexes) {
      const ops = byName[idx.name]?.accesses?.ops ?? 0;
      const key = JSON.stringify(idx.key);
      console.log(`  ${idx.name.padEnd(45)} ops=${String(ops).padStart(5)}  ${key}`);
    }
    console.log();
  }

  if (DROPS.length) {
    console.log("---- Proposed drops ----");
    for (const { collection, index } of DROPS) {
      const exists = (await db.collection(collection).indexes()).some(
        (i) => i.name === index
      );
      if (!exists) {
        console.log(`  (skip) ${collection}.${index} — already absent`);
        continue;
      }
      if (APPLY) {
        await db.collection(collection).dropIndex(index);
        console.log(`  ✅ dropped ${collection}.${index}`);
      } else {
        console.log(`  would drop ${collection}.${index}`);
      }
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
