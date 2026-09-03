import XLSX from "./xlsxCompat.js";

/**
 * Excel template and parser for bulk category upload.
 *
 * Categories differ from products in one way that shapes everything here: a row
 * can refer to another row. "IP Camera" may name "Surveillance Systems" as its
 * parent whether that parent is already in the database or three rows further
 * down the same sheet. So the parent is carried as a *name*, resolved after
 * every row exists — see bulkCategory.controller.js.
 */

const COLUMNS = [
  "Category Name",
  "Arabic Name",
  "Parent Category",
  "Description",
  "Arabic Description",
  "Image URL",
  "Sort Order",
  "Active",
  "Show In Menu",
];

const EXAMPLE_ROWS = [
  {
    "Category Name": "Surveillance Systems",
    "Arabic Name": "أنظمة المراقبة",
    "Parent Category": "",
    Description: "Cameras, recorders and intercom",
    "Arabic Description": "كاميرات وأجهزة تسجيل وإنتركم",
    "Image URL": "",
    "Sort Order": 1,
    Active: "TRUE",
    "Show In Menu": "TRUE",
  },
  {
    "Category Name": "IP Camera",
    "Arabic Name": "كاميرات IP",
    "Parent Category": "Surveillance Systems",
    Description: "Network cameras",
    "Arabic Description": "كاميرات شبكة",
    "Image URL": "",
    "Sort Order": 1,
    Active: "TRUE",
    "Show In Menu": "TRUE",
  },
  {
    "Category Name": "Dome Cameras",
    "Arabic Name": "كاميرات دوم",
    "Parent Category": "IP Camera",
    Description: "Third level — a subcategory of a subcategory",
    "Arabic Description": "المستوى الثالث",
    "Image URL": "",
    "Sort Order": 1,
    Active: "TRUE",
    "Show In Menu": "TRUE",
  },
];

const INSTRUCTIONS = [
  {
    Field: "Category Name",
    Required: "YES",
    Notes: "Matched case-insensitively. An existing category with this name is updated, not duplicated.",
  },
  {
    Field: "Arabic Name",
    Required: "NO",
    Notes: "Shown to shoppers browsing in Arabic. Left blank, the English name is used.",
  },
  {
    Field: "Parent Category",
    Required: "NO",
    Notes:
      "The name of another category. May appear anywhere in this sheet — above or below this row — or already exist. Blank means a top-level category.",
  },
  { Field: "Description", Required: "NO", Notes: "Free text." },
  { Field: "Arabic Description", Required: "NO", Notes: "Free text." },
  { Field: "Image URL", Required: "NO", Notes: "Full https:// link. Blank falls back to an icon." },
  { Field: "Sort Order", Required: "NO", Notes: "Number. Lower sorts first among siblings. Default 0." },
  { Field: "Active", Required: "NO", Notes: "TRUE or FALSE. Default TRUE. FALSE hides it from the storefront." },
  {
    Field: "Show In Menu",
    Required: "NO",
    Notes: "TRUE or FALSE. Default TRUE. FALSE keeps it browsable but out of the top menu.",
  },
];

export const generateCategoryTemplate = async () => {
  const workbook = XLSX.utils.book_new();

  const sheet = XLSX.utils.json_to_sheet(EXAMPLE_ROWS, { header: COLUMNS });
  sheet["!cols"] = [
    { wch: 26 }, { wch: 22 }, { wch: 24 }, { wch: 34 },
    { wch: 30 }, { wch: 30 }, { wch: 11 }, { wch: 9 }, { wch: 13 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, "Categories");

  const guide = XLSX.utils.json_to_sheet(INSTRUCTIONS);
  guide["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 95 }];
  XLSX.utils.book_append_sheet(workbook, guide, "Instructions");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

// Blank, "FALSE", "false", "0", "no" are all false; anything else with content
// is true. Sheets export booleans in every one of these shapes.
const parseBool = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") return fallback;
  const text = String(value).trim().toLowerCase();
  if (["false", "0", "no", "لا"].includes(text)) return false;
  if (["true", "1", "yes", "نعم"].includes(text)) return true;
  return fallback;
};

export const parseCategoryExcel = async (fileBuffer) => {
  const workbook = await XLSX.read(fileBuffer, { type: "buffer" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet);

  return rows.map((row, index) => ({
    rowNumber: index + 2, // +2: Excel is 1-indexed and row 1 is the header
    name: row["Category Name"]?.toString().trim() ?? "",
    nameAr: row["Arabic Name"]?.toString().trim() ?? "",
    parentName: row["Parent Category"]?.toString().trim() ?? "",
    description: row["Description"]?.toString().trim() ?? "",
    descriptionAr: row["Arabic Description"]?.toString().trim() ?? "",
    image: row["Image URL"]?.toString().trim() ?? "",
    sortOrder: Number.parseInt(row["Sort Order"], 10) || 0,
    isActive: parseBool(row["Active"]),
    showInMenu: parseBool(row["Show In Menu"]),
  }));
};
