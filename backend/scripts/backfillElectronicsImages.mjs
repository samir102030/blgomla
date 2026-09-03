/**
 * Put the electronics products' images back from the sheet they came in on.
 *
 *   node scripts/backfillElectronicsImages.mjs <workbook.xlsx> --confirm
 *   node scripts/backfillElectronicsImages.mjs <workbook.xlsx> --dry
 *
 * The import that created these 5,656 products read every column except the
 * four image URLs, so the whole section arrived without a single picture while
 * the general catalogue has one on every row. The sheet still has them, and
 * SKU matches on every row, so the pictures can be put back where they belong
 * rather than re-imported — which would give every product a new id and break
 * the categories they were just filed into.
 *
 * Only products that have no image are touched. A product somebody has since
 * given a picture to by hand keeps it.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
/*
  The ExcelJS shim, not the `xlsx` package — commit 6 took that off
  package.json. Its readers are async, so the calls below gained an `await`.
*/
import XLSX from "../utils/xlsxCompat.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Product from "../models/product.model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const dry = args.includes("--dry");
if (!file || (!dry && !args.includes("--confirm"))) {
  console.error("usage: node scripts/backfillElectronicsImages.mjs <workbook.xlsx> (--confirm | --dry)");
  process.exit(1);
}

const IMAGE_COLUMNS = ["Image URL 1", "Image URL 2", "Image URL 3", "Image URL 4"];
const norm = (v) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const workbook = await XLSX.readFile(file);
const sheet = workbook.Sheets.Products || workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
console.log(`sheet rows: ${rows.length}`);

await mongoose.connect(process.env.MONGO_URI);

// Matched on SKU. The names match too, but a SKU is the thing the shop treats
// as an identity, and two products can honestly share a name.
const bySku = new Map();
for (const row of rows) {
  const key = norm(row.SKU);
  if (!key) continue;
  const urls = IMAGE_COLUMNS.map((c) => String(row[c] ?? "").trim()).filter((u) =>
    u.startsWith("http"),
  );
  if (urls.length) bySku.set(key, { urls, alt: String(row["Product Name"] ?? "").trim() });
}
console.log(`rows carrying at least one image: ${bySku.size}`);

const products = await Product.find({ audience: "electronics" })
  .select("_id sku name images")
  .lean();

const ops = [];
let alreadyHad = 0;
let unmatched = 0;

for (const product of products) {
  if (product.images?.length) {
    alreadyHad += 1;
    continue;
  }
  const match = bySku.get(norm(product.sku));
  if (!match) {
    unmatched += 1;
    continue;
  }
  ops.push({
    updateOne: {
      filter: { _id: product._id },
      update: { $set: { images: match.urls.map((url) => ({ url, alt: match.alt })) } },
    },
  });
}

console.log(`products: ${products.length}`);
console.log(`  already had an image : ${alreadyHad}`);
console.log(`  no row in the sheet  : ${unmatched}`);
console.log(`  to be given images   : ${ops.length}`);

if (dry) {
  console.log("\n(dry run — nothing written)");
} else if (ops.length) {
  const result = await Product.bulkWrite(ops, { ordered: false });
  console.log(`\nwritten: ${result.modifiedCount}`);
}

await mongoose.disconnect();
