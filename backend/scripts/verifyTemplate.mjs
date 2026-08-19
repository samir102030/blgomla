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
import XLSX from "xlsx";
import { generateProductTemplate, parseProductExcel } from "../utils/excelTemplate.js";

for (const variant of ["full", "simple"]) {
  const buffer = generateProductTemplate(variant);
  const wb = XLSX.read(buffer, { type: "buffer" });
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

  const parsed = parseProductExcel(buffer, variant);
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
const wideParsed = parseProductExcel(
  XLSX.write(wideBook, { type: "buffer", bookType: "xlsx" }),
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
