import XLSX from "xlsx";

/**
 * Templates and parsers for bulk-loading the student section's catalogue.
 *
 * Deliberately its own file rather than a flag on `categoryExcel.js` and
 * `excelTemplate.js`. The two catalogues do not share a column list: the shop's
 * product sheet carries brand, store, approval state, variants and installation
 * pricing, none of which the section has, and a template full of columns that
 * do nothing is a template people fill in wrong.
 *
 * Both sheets carry the parent as a *name*, resolved after every row exists, so
 * a row may name a department defined three rows further down. Requiring
 * parents-first is not how anyone writes a sheet.
 */

/* ─────────────────────────── shared ─────────────────────────── */

// Blank, "FALSE", "0", "no", "لا" are false; anything else with content is
// true. Sheets export booleans in every one of these shapes.
const parseBool = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") return fallback;
  const text = String(value).trim().toLowerCase();
  if (["false", "0", "no", "لا"].includes(text)) return false;
  if (["true", "1", "yes", "نعم"].includes(text)) return true;
  return fallback;
};

const text = (value) => value?.toString().trim() ?? "";

const write = (workbook) => XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

/* ────────────────────────── departments ────────────────────────── */

const CATEGORY_COLUMNS = [
  "Department Name",
  "Arabic Name",
  "Parent Department",
  "Description",
  "Arabic Description",
  "Image URL",
  "Order",
  "Active",
];

const CATEGORY_EXAMPLES = [
  {
    "Department Name": "Lab equipment",
    "Arabic Name": "أدوات معمل",
    "Parent Department": "",
    Description: "Bench instruments and measurement",
    "Arabic Description": "أجهزة قياس وأدوات بنش",
    "Image URL": "",
    Order: 1,
    Active: "TRUE",
  },
  {
    "Department Name": "Starter kits",
    "Arabic Name": "كيتات البداية",
    "Parent Department": "Lab equipment",
    Description: "Arduino, Raspberry Pi and project kits",
    "Arabic Description": "أردوينو وراسبيري باي وكيتات المشاريع",
    "Image URL": "",
    Order: 1,
    Active: "TRUE",
  },
  {
    "Department Name": "Sensor packs",
    "Arabic Name": "حزم الحساسات",
    "Parent Department": "Starter kits",
    Description: "Third level — a department inside a department",
    "Arabic Description": "المستوى الثالث",
    "Image URL": "",
    Order: 2,
    Active: "TRUE",
  },
];

const CATEGORY_GUIDE = [
  {
    Field: "Department Name",
    Required: "YES",
    Notes:
      "Matched case-insensitively. A department that already exists is updated, not duplicated.",
  },
  {
    Field: "Arabic Name",
    Required: "NO",
    Notes: "Shown to students browsing in Arabic. Blank falls back to the English name.",
  },
  {
    Field: "Parent Department",
    Required: "NO",
    Notes:
      "The name of another department. May appear anywhere in this sheet — above or below this row — or already exist. Blank means a top-level department.",
  },
  { Field: "Description", Required: "NO", Notes: "Free text." },
  { Field: "Arabic Description", Required: "NO", Notes: "Free text." },
  { Field: "Image URL", Required: "NO", Notes: "Full https:// link." },
  { Field: "Order", Required: "NO", Notes: "Number. Lower sorts first among siblings. Default 0." },
  {
    Field: "Active",
    Required: "NO",
    Notes: "TRUE or FALSE. Default TRUE. FALSE keeps the department but hides it from the section.",
  },
];

export const generateStudentCategoryTemplate = () => {
  const workbook = XLSX.utils.book_new();

  const sheet = XLSX.utils.json_to_sheet(CATEGORY_EXAMPLES, { header: CATEGORY_COLUMNS });
  sheet["!cols"] = [
    { wch: 26 }, { wch: 22 }, { wch: 24 }, { wch: 34 }, { wch: 30 }, { wch: 30 }, { wch: 9 }, { wch: 9 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, "Departments");

  const guide = XLSX.utils.json_to_sheet(CATEGORY_GUIDE);
  guide["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 95 }];
  XLSX.utils.book_append_sheet(workbook, guide, "Instructions");

  return write(workbook);
};

export const parseStudentCategoryExcel = (fileBuffer) => {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

  return rows.map((row, index) => ({
    rowNumber: index + 2, // +2: Excel is 1-indexed and row 1 is the header
    name: text(row["Department Name"]),
    nameAr: text(row["Arabic Name"]),
    parentName: text(row["Parent Department"]),
    description: text(row["Description"]),
    descriptionAr: text(row["Arabic Description"]),
    image: text(row["Image URL"]),
    order: Number.parseInt(row["Order"], 10) || 0,
    active: parseBool(row["Active"]),
  }));
};

/* ─────────────────────────── products ─────────────────────────── */

const PRODUCT_COLUMNS = [
  "Product Name",
  "Arabic Name",
  "Department",
  "Price",
  "Stock",
  "SKU",
  "Description",
  "Arabic Description",
  "Image URLs",
  "Tags",
  "Featured",
  "Active",
];

const PRODUCT_EXAMPLES = [
  {
    "Product Name": "Arduino Uno R3 starter kit",
    "Arabic Name": "كيت أردوينو أونو R3",
    Department: "Starter kits",
    Price: 1450,
    Stock: 12,
    SKU: "STU-ARD-UNO",
    Description: "Board, breadboard, jumpers and the common sensors",
    "Arabic Description": "بورد وبريدبورد وأسلاك والحساسات الشائعة",
    "Image URLs": "https://example.com/kit-1.jpg, https://example.com/kit-2.jpg",
    Tags: "arduino, kit, projects",
    Featured: "TRUE",
    Active: "TRUE",
  },
  {
    "Product Name": "Digital multimeter DT9205A",
    "Arabic Name": "أفوميتر ديجيتال",
    Department: "Lab equipment",
    Price: 480,
    Stock: 30,
    SKU: "",
    Description: "Voltage, current, resistance and continuity",
    "Arabic Description": "فولت وأمبير ومقاومة واستمرارية",
    "Image URLs": "",
    Tags: "measurement",
    Featured: "FALSE",
    Active: "TRUE",
  },
];

const PRODUCT_GUIDE = [
  {
    Field: "Product Name",
    Required: "YES",
    Notes:
      "Matched case-insensitively against the section's products. An existing one is updated, not duplicated.",
  },
  { Field: "Arabic Name", Required: "NO", Notes: "Blank falls back to the English name." },
  {
    Field: "Department",
    Required: "NO",
    Notes:
      "The name of a department in the student section. Created if it does not exist yet. Blank leaves the product unfiled — it will still show on the shelf, just not under any department.",
  },
  {
    Field: "Price",
    Required: "NO",
    Notes:
      "Number, in EGP. Leave blank and the row still imports — at price 0 and hidden, until you price it.",
  },
  { Field: "Stock", Required: "NO", Notes: "Whole number. Default 0." },
  { Field: "SKU", Required: "NO", Notes: "Must be unique across the whole shop if set." },
  { Field: "Description", Required: "NO", Notes: "Free text." },
  { Field: "Arabic Description", Required: "NO", Notes: "Free text." },
  {
    Field: "Image URLs",
    Required: "NO",
    Notes: "Full https:// links, separated by commas. The first is the one shown in listings.",
  },
  { Field: "Tags", Required: "NO", Notes: "Comma-separated. Used by the section's search." },
  { Field: "Featured", Required: "NO", Notes: "TRUE or FALSE. Featured products sort first." },
  {
    Field: "Active",
    Required: "NO",
    Notes: "TRUE or FALSE. Default TRUE. FALSE keeps the product but hides it from the section.",
  },
];

export const generateStudentProductTemplate = () => {
  const workbook = XLSX.utils.book_new();

  const sheet = XLSX.utils.json_to_sheet(PRODUCT_EXAMPLES, { header: PRODUCT_COLUMNS });
  sheet["!cols"] = [
    { wch: 38 }, { wch: 26 }, { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 16 },
    { wch: 40 }, { wch: 34 }, { wch: 46 }, { wch: 24 }, { wch: 10 }, { wch: 9 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, "Products");

  const guide = XLSX.utils.json_to_sheet(PRODUCT_GUIDE);
  guide["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(workbook, guide, "Instructions");

  return write(workbook);
};

const splitList = (value) =>
  text(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

export const parseStudentProductExcel = (fileBuffer) => {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

  return rows.map((row, index) => {
    const rawPrice = row["Price"];
    const price = Number.parseFloat(rawPrice);

    return {
      rowNumber: index + 2,
      name: text(row["Product Name"]),
      nameAr: text(row["Arabic Name"]),
      departmentName: text(row["Department"]),
      // A blank price is not zero-by-mistake — it means "not priced yet", which
      // the importer treats as a success that needs following up.
      price: Number.isFinite(price) ? price : null,
      stock: Number.parseInt(row["Stock"], 10) || 0,
      sku: text(row["SKU"]),
      description: text(row["Description"]),
      descriptionAr: text(row["Arabic Description"]),
      images: splitList(row["Image URLs"]).map((url) => ({ url })),
      tags: splitList(row["Tags"]),
      featured: parseBool(row["Featured"], false),
      active: parseBool(row["Active"]),
    };
  });
};

/** The section's products, in the shape its own template reads back. */
export const exportStudentProductsToExcel = (products, departmentName) => {
  const workbook = XLSX.utils.book_new();

  const rows = products.map((p) => ({
    "Product Name": p.name || "",
    "Arabic Name": p.nameAr || "",
    Department: departmentName(p.studentCategory) || "",
    Price: p.price ?? 0,
    Stock: p.stock ?? 0,
    SKU: p.sku || "",
    Description: p.description || "",
    "Arabic Description": p.descriptionAr || "",
    "Image URLs": (p.images || []).map((i) => i?.url).filter(Boolean).join(", "),
    Tags: (p.tags || []).join(", "),
    Featured: p.featured ? "TRUE" : "FALSE",
    Active: p.isActive === false ? "FALSE" : "TRUE",
  }));

  const sheet = XLSX.utils.json_to_sheet(rows, { header: PRODUCT_COLUMNS });
  sheet["!cols"] = [
    { wch: 38 }, { wch: 26 }, { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 16 },
    { wch: 40 }, { wch: 34 }, { wch: 46 }, { wch: 24 }, { wch: 10 }, { wch: 9 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, "Products");

  return write(workbook);
};
