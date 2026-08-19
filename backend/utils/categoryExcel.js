import XLSX from "xlsx";

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

/**
 * Export the category tree as a workbook of two sheets.
 *
 * Sheet 1, "Categories", is the upload template exactly — same nine columns, in
 * the same order, nothing else. That is what makes the round trip safe to
 * promise: the file that comes out is shaped like the file that goes in, so
 * there is no question of which columns survive an edit.
 *
 * Sheet 2, "Tree", is the same rows with where they sit — level, full path,
 * each ancestor in its own column, and the product counts. It is read-only
 * context and the importer never looks at it: a flat list of names cannot be
 * checked against anything, because two categories called "Switches" under
 * different departments are identical on paper and there is no way to see that
 * a parent holds nothing while its children hold hundreds.
 *
 * Keeping them apart is what lets both be true at once. Extra columns on sheet
 * 1 would be ignored on re-upload anyway — the parser reads by header name —
 * but "ignored" is a thing you have to know, and a sheet that matches the
 * template needs no explaining.
 */
export const CATEGORY_EXPORT_HEADERS = [...COLUMNS];

export const CATEGORY_TREE_HEADERS = [
  "Category Name",
  "Level",
  "Full Path",
  "Level 1",
  "Level 2",
  "Level 3",
  "Parent Category",
  "Direct Products",
  "Products In Branch",
  "Subcategories",
  "Active",
  "Show In Menu",
  "Deleted",
  "ID",
];

/**
 * @param {Array} categories lean category docs
 * @param {Map<string, number>} directCounts categoryId → products filed on it
 */
export const buildCategoryExport = (categories, directCounts = new Map()) => {
  const byId = new Map(categories.map((c) => [String(c._id), c]));
  const parentIdOf = (c) => {
    const parent = c?.parentCategory;
    if (!parent) return null;
    return typeof parent === "object" ? String(parent._id ?? parent) : String(parent);
  };

  const childrenOf = new Map();
  for (const c of categories) {
    const parent = parentIdOf(c);
    if (!parent) continue;
    childrenOf.set(parent, [...(childrenOf.get(parent) || []), c]);
  }

  // Ancestors nearest-last, guarded so bad data cannot loop the walk forever.
  const trailOf = (c) => {
    const names = [];
    let parent = parentIdOf(c);
    let guard = 0;
    while (parent && guard++ < 10) {
      const p = byId.get(parent);
      if (!p) break;
      names.unshift(p.name ?? "");
      parent = parentIdOf(p);
    }
    return names;
  };

  const branchCount = (c, guard = 0) => {
    if (guard > 10) return 0;
    let total = directCounts.get(String(c._id)) || 0;
    for (const child of childrenOf.get(String(c._id)) || []) {
      total += branchCount(child, guard + 1);
    }
    return total;
  };

  // Depth-first from the roots, so a parent is always the row above its
  // children — the sheet reads as the tree rather than as an id-ordered dump.
  const ordered = [];
  const walk = (list, guard = 0) => {
    if (guard > 10) return;
    const sorted = [...list].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.name || "").localeCompare(b.name || "")
    );
    for (const c of sorted) {
      ordered.push(c);
      walk(childrenOf.get(String(c._id)) || [], guard + 1);
    }
  };
  // A category whose parent is missing is still exported, at the top: a row
  // left out of the sheet is a row nobody can fix.
  walk(categories.filter((c) => !parentIdOf(c) || !byId.has(parentIdOf(c))));

  const uploadRows = [];
  const treeRows = [];
  for (const c of ordered) {
    const trail = trailOf(c);
    const name = c.name ?? "";
    const parentName = trail.length ? trail[trail.length - 1] : "";
    // The path with the category itself on the end, so "Level N" reads as the
    // Nth step of the full path rather than of the ancestors alone.
    const chain = [...trail, name];

    uploadRows.push({
      "Category Name": name,
      "Arabic Name": c.nameAr ?? "",
      "Parent Category": parentName,
      Description: c.description ?? "",
      "Arabic Description": c.descriptionAr ?? "",
      "Image URL": c.image ?? "",
      "Sort Order": c.sortOrder ?? 0,
      Active: c.isActive === false ? "FALSE" : "TRUE",
      "Show In Menu": c.showInMenu === false ? "FALSE" : "TRUE",
    });

    treeRows.push({
      "Category Name": name,
      Level: trail.length,
      "Full Path": chain.join(" > "),
      "Level 1": chain[0] ?? "",
      "Level 2": chain[1] ?? "",
      "Level 3": chain[2] ?? "",
      "Parent Category": parentName,
      "Direct Products": directCounts.get(String(c._id)) || 0,
      "Products In Branch": branchCount(c),
      Subcategories: (childrenOf.get(String(c._id)) || []).length,
      Active: c.isActive === false ? "FALSE" : "TRUE",
      "Show In Menu": c.showInMenu === false ? "FALSE" : "TRUE",
      Deleted: c.deleted ? "TRUE" : "",
      ID: String(c._id),
    });
  }

  const workbook = XLSX.utils.book_new();

  const sheet = XLSX.utils.json_to_sheet(uploadRows, {
    header: CATEGORY_EXPORT_HEADERS,
  });
  sheet["!cols"] = [
    { wch: 30 }, { wch: 26 }, { wch: 26 }, { wch: 34 },
    { wch: 34 }, { wch: 30 }, { wch: 10 }, { wch: 8 }, { wch: 12 },
  ];
  sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(workbook, sheet, "Categories");

  const tree = XLSX.utils.json_to_sheet(treeRows, { header: CATEGORY_TREE_HEADERS });
  tree["!cols"] = [
    { wch: 30 }, { wch: 7 }, { wch: 52 }, { wch: 24 }, { wch: 24 }, { wch: 24 },
    { wch: 26 }, { wch: 15 }, { wch: 18 }, { wch: 14 }, { wch: 8 }, { wch: 12 },
    { wch: 9 }, { wch: 26 },
  ];
  tree["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(workbook, tree, "Tree");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

export const generateCategoryTemplate = () => {
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

/**
 * Trim, and drop the invisible characters a spreadsheet picks up — zero-width
 * space and friends, a stray BOM from a CSV round-trip, a soft hyphen.
 *
 * String.trim() leaves every one of them: none is White_Space as Unicode
 * defines it. That matters because the importer keys categories by name while
 * the database enforces uniqueness on the slug, and the model slugifies a
 * zero-width space away. "​Rapoo" therefore reads as a new category, gets
 * created, and dies on the unique slug index against the "Rapoo" already
 * there — a duplicate-key error over two names that render identically.
 */
const cleanText = (value) =>
  String(value ?? "")
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u00AD]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const parseCategoryExcel = (fileBuffer) => {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet);

  return rows.map((row, index) => ({
    rowNumber: index + 2, // +2: Excel is 1-indexed and row 1 is the header
    name: cleanText(row["Category Name"]),
    nameAr: cleanText(row["Arabic Name"]),
    parentName: cleanText(row["Parent Category"]),
    description: cleanText(row["Description"]),
    descriptionAr: cleanText(row["Arabic Description"]),
    image: row["Image URL"]?.toString().trim() ?? "",
    sortOrder: Number.parseInt(row["Sort Order"], 10) || 0,
    isActive: parseBool(row["Active"]),
    showInMenu: parseBool(row["Show In Menu"]),
  }));
};
