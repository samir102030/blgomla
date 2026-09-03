/**
 * Read back the generated template and print its columns.
 *
 * The generator's output is a binary a reviewer cannot eyeball, so a change to
 * the column set is otherwise only visible by downloading the file and opening
 * Excel. This also round-trips the sheet through the importer's own parser, so
 * "the template still imports" is checked rather than assumed.
 *
 *   node scripts/verifyTemplate.mjs
 */
import { readFileSync } from "fs";
/*
   The ExcelJS shim, not the `xlsx` package — which commit 6 removed from
   package.json without moving this file, so CI has been red since. Its `read`
   and `write` are async, hence the awaits below; `.mjs` gives us top-level
   await, so nothing here needed restructuring.
 */
import XLSX from "../utils/xlsxCompat.js";
import { generateProductTemplate, parseProductExcel } from "../utils/excelTemplate.js";
import { PRODUCT_EXPORT_HEADERS, buildProductExport } from "../utils/productExport.js";

for (const variant of ["full", "simple"]) {
  const buffer = await generateProductTemplate(variant);
  const wb = await XLSX.read(buffer, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  const header = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
  })[0];

  console.log(`\n=== ${variant} ===`);
  console.log(`sheets:  ${wb.SheetNames.join(", ")}`);
  console.log(`columns: ${header.length}`);
  header.forEach((h, i) => console.log(`  ${String(i + 1).padStart(2)}. ${h}`));
  console.log(`example rows: ${rows.length}`);
  console.log(`  row 1 name: ${rows[0]?.["Product Name"]}`);

  const parsed = await parseProductExcel(buffer, variant);
  const first = parsed.products?.[0] ?? parsed[0];
  console.log(
    `parsed back: ${(parsed.products ?? parsed).length} products, ` +
      `first = "${first?.name}" price=${first?.price} category=${first?.categoryName ?? "-"}`
  );
}

// The blank sheet is narrow again, but the importer was never narrowed with it:
// a seller holding a file with the wider columns — or a fresh export, which
// still writes them — must keep importing them rather than silently dropping
// the Arabic name and the fitting block on upload.
console.log("\n=== a wide sheet still imports ===");
const wide = XLSX.utils.json_to_sheet([
  {
    "Product Name": "Wide Sheet Product",
    "Arabic Name": "منتج بأعمدة كاملة",
    SKU: "WIDE-001",
    Description: "Has every column the old template dropped.",
    "Arabic Description": "يحتوي على كل الأعمدة الإضافية.",
    Price: 1200,
    Stock: 4,
    "Min Order Qty": 3,
    "Category Name": "IP Camera",
    "Brand Name": "Hikvision",
    Attributes: "Aspect Ratio:16:9 | Lens:2.8 mm",
    "Installation Offered": "TRUE",
    "Installation Price": 250,
    "Installation Note": "Fitting on site",
    "Installation Note (Arabic)": "التركيب في الموقع",
  },
]);
const wideBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wideBook, wide, "Products");
const wideParsed = await parseProductExcel(
  await XLSX.write(wideBook, { type: "buffer", bookType: "xlsx" }),
  "full"
);
const p = (wideParsed.products ?? wideParsed)[0];
console.log(`  name:         ${p?.name}`);
console.log(`  nameAr:       ${p?.nameAr || "(dropped)"}`);
console.log(`  sku:          ${p?.sku || "(dropped)"}`);
console.log(`  minOrderQty:  ${p?.minOrderQty}`);
console.log(`  installation: ${JSON.stringify(p?.installation) || "(dropped)"}`);
// The colon fix from the same commit: a 16:9 value must survive whole.
const ratio = p?.attributes?.find((a) => a.name === "Aspect Ratio");
console.log(`  "Aspect Ratio" value: ${ratio?.value}  (must be "16:9", not "16")`);

/*
  Everything above prints. From here it also fails.

  The export writes 25 column headings and the importer reads them back by
  those exact strings — the coupling between a Product field and its column is
  the spelling of an English heading, in a different file. Renaming a field
  breaks nothing a compiler can see: the export keeps writing the column, the
  importer keeps looking for it and finding nothing, and the upload succeeds
  with that field blank. The visible symptom is somebody's Arabic names quietly
  gone after a bulk edit.

  So the round trip is asserted rather than eyeballed. A real export is built
  from a product covering every column, parsed back through the importer, and
  compared field by field. No database and no server: it is the two files
  checking each other, which is exactly what CI can run.
*/
const failures = [];
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  return ok;
};

console.log("\n=== export → import round trip ===");

const sample = {
  name: "Round Trip Product",
  nameAr: "منتج اختبار",
  sku: "RT-001",
  description: "Every column filled.",
  descriptionAr: "كل الأعمدة مليانة.",
  price: 1499,
  stock: 7,
  minOrderQty: 3,
  category: { name: "IP Camera" },
  brand: { name: "Hikvision" },
  salePercentage: 15,
  saleActive: true,
  featured: true,
  tags: ["alpha", "beta"],
  features: ["Feature one", "Feature two"],
  attributes: [{ name: "Aspect Ratio", value: "16:9" }],
  installation: { offered: true, price: 250, note: "Fitting on site", noteAr: "التركيب في الموقع" },
  images: [{ url: "https://example.com/a.jpg" }, { url: "https://example.com/b.jpg" }],
  bulkPricing: [{ minQty: 10, unitPrice: 1300 }],
};

// parseProductExcel answers with either { products } or a bare array depending
// on the variant, the same way the printing pass above has to cope with.
const parsedExport = await parseProductExcel(await buildProductExport([sample]), "full");
const roundTripped = (parsedExport.products ?? parsedExport)[0];

if (!roundTripped) {
  failures.push("the importer read nothing back out of a fresh export");
} else {
  check("name", roundTripped.name, sample.name);
  check("nameAr", roundTripped.nameAr, sample.nameAr);
  check("sku", roundTripped.sku, sample.sku);
  check("descriptionAr", roundTripped.descriptionAr, sample.descriptionAr);
  check("price", roundTripped.price, sample.price);
  check("stock", roundTripped.stock, sample.stock);
  check("minOrderQty", roundTripped.minOrderQty, sample.minOrderQty);
  check("salePercentage", roundTripped.salePercentage, sample.salePercentage);
  check("saleActive", roundTripped.saleActive, true);
  check("featured", roundTripped.featured, true);
  check("installation.offered", roundTripped.installation?.offered, true);
  check("installation.price", roundTripped.installation?.price, 250);
  check("installation.noteAr", roundTripped.installation?.noteAr, sample.installation.noteAr);
  check("attributes[Aspect Ratio]",
    roundTripped.attributes?.find((a) => a.name === "Aspect Ratio")?.value, "16:9");
  check("images", (roundTripped.images || []).map((i) => i.url),
    sample.images.map((i) => i.url));
  check("categoryName", roundTripped.categoryName ?? roundTripped.category, "IP Camera");
  check("brandName", roundTripped.brandName ?? roundTripped.brand, "Hikvision");
}

// Every heading the export writes must be one the importer looks for. Read off
// the importer's source rather than a second list kept here, so this cannot
// drift into agreeing with itself.
const importerSource = readFileSync(
  new URL("../utils/excelTemplate.js", import.meta.url),
  "utf8"
);
const readsHeader = (heading) =>
  importerSource.includes(`'${heading}'`) ||
  importerSource.includes(`"${heading}"`) ||
  // Image URL 1-4 are read in a loop, by template literal.
  /^Image URL \d$/.test(heading);

const unread = PRODUCT_EXPORT_HEADERS.filter((h) => !readsHeader(h));
if (unread.length) {
  failures.push(`columns the export writes and the importer never reads: ${unread.join(", ")}`);
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} problem(s) with the export/import contract:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\n✓ round trip intact across ${PRODUCT_EXPORT_HEADERS.length} columns`);
