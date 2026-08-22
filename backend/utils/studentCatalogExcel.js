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

/**
 * Column headers are matched loosely, and on purpose.
 *
 * The sheet somebody has in hand is rarely the one this template produced. It
 * is the shop's category export, or a supplier's list, or the same file after
 * Excel decided to capitalise something — all describing the same thing under
 * a different heading. Matching the header string exactly turns every one of
 * those into 134 rows that read as empty, with nothing on screen explaining
 * why.
 *
 * So a header is reduced to its letters and digits and compared against a set
 * of names that mean the same thing, in either language.
 */
const headerKey = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]/g, "");

/**
 * The alias list is ordered by preference, and the *first alias that exists*
 * wins — not the first column that happens to match one.
 *
 * That distinction matters on a sheet carrying both "Product Name" and
 * "Category". Scanning columns and taking the first hit makes the answer
 * depend on column order, so the same file imports differently depending on
 * where somebody dragged a column. Scanning aliases makes it depend on what
 * the reader means, which is the same every time.
 */
const readCell = (row, aliases, index) => {
  for (const alias of aliases) {
    const column = index.get(alias);
    if (column !== undefined) return row[column];
  }
  return undefined;
};

const indexColumns = (columns) => {
  const map = new Map();
  for (const column of columns) {
    const key = headerKey(column);
    if (!map.has(key)) map.set(key, column);
  }
  return map;
};

/** Shared between both sheets — these mean the same thing on either. */
const COMMON = {
  nameAr: ["arabicname", "namear", "الاسمبالعربي", "الاسمالعربي", "الاسمعربي"],
  description: ["description", "الوصف"],
  descriptionAr: ["arabicdescription", "descriptionar", "الوصفبالعربي", "الوصفالعربي"],
  image: ["imageurls", "imageurl", "images", "image", "الصور", "الصورة", "رابطالصور", "رابطالصورة"],
  active: ["active", "isactive", "نشط", "ظاهر", "مفعل"],
};

const CATEGORY_ALIASES = {
  ...COMMON,
  name: ["departmentname", "categoryname", "name", "department", "category", "اسمالقسم", "الاسم", "القسم"],
  parent: ["parentdepartment", "parentcategory", "parent", "القسمالأب", "القسمالاب", "الأب", "الاب", "القسمالرئيسي"],
  order: ["order", "sortorder", "sort", "الترتيب"],
};

const PRODUCT_ALIASES = {
  ...COMMON,
  name: ["productname", "name", "اسمالمنتج", "الاسم", "المنتج"],
  department: ["department", "categoryname", "category", "القسم", "التصنيف"],
  price: ["price", "السعر"],
  stock: ["stock", "quantity", "qty", "المخزون", "الكمية"],
  sku: ["sku", "productcode", "code", "كودالمنتج", "الكود"],
  tags: ["tags", "keywords", "الوسوم", "الكلمات"],
  featured: ["featured", "مميز"],
  /*
    The rest of the shop's own product export.

    The file somebody brings to this page is usually a catalogue export rather
    than this section's narrower template — same products, every column the
    main sheet carries. Reading only the twelve this template defines meant
    importing them stripped: no attributes, no features, no fitting block, and
    no images at all, because that sheet spells them "Image URL 1" through
    "Image URL 4" and nothing here matched a numbered column.
  */
  minOrderQty: ["minorderqty", "minimumorderquantity", "minorder", "أقلكمية", "اقلكمية"],
  salePercentage: ["salepercentage", "discount", "نسبةالخصم", "الخصم"],
  saleActive: ["saleactive", "onsale", "خصمنشط"],
  features: ["features", "المميزات", "الخصائص"],
  attributes: ["attributes", "specs", "specifications", "المواصفات"],
  installationOffered: ["installationoffered", "التركيبمتاح"],
  installationPrice: ["installationprice", "سعرالتركيب"],
  installationNote: ["installationnote", "ملاحظةالتركيب"],
  installationNoteAr: ["installationnotearabic", "installationnotear", "ملاحظةالتركيببالعربي"],
  bulkPricing: ["bulkpricing", "أسعارالجملة", "اسعارالجمله"],
};

/**
 * Image columns, however the sheet writes them.
 *
 * One column holding a list, or four numbered ones — the shop's export writes
 * the second shape and this template the first, and a file has to import whole
 * either way.
 */
const readImages = (row, index) => {
  const listed = splitList(readCell(row, CATEGORY_ALIASES.image, index));
  const numbered = [];
  for (let n = 1; n <= 8; n += 1) {
    const column = index.get(`imageurl${n}`) ?? index.get(`image${n}`);
    const url = text(column !== undefined ? row[column] : undefined);
    if (url) numbered.push(url);
  }
  return [...new Set([...listed, ...numbered])].map((url) => ({ url }));
};

/** "name:value | name:value" — split on the first colon so "16:9" survives. */
const readPairs = (value) =>
  String(value ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const at = part.indexOf(":");
      return at > 0
        ? { name: part.slice(0, at).trim(), value: part.slice(at + 1).trim() }
        : null;
    })
    .filter(Boolean);

/**
 * The sheet the rows are actually on.
 *
 * A workbook from this template has an Instructions tab beside the data, and
 * one from somewhere else may have the data on the third tab with two empty
 * ones in front. Taking `SheetNames[0]` and hoping is how an import reads a
 * guide page and reports nothing to load, so every sheet is tried and the
 * first one carrying rows with a usable name wins.
 */
const findDataSheet = (workbook, nameAliases) => {
  let fallback = null;

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    if (!rows.length) continue;

    // Columns are collected across rows, not read off the first one: a blank
    // cell makes `sheet_to_json` drop that key from that row entirely, so a
    // sheet whose first row has no parent looks like it has no parent column.
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const index = indexColumns(columns);
    if (!fallback) fallback = { rows, columns, index, sheetName };

    if (rows.some((row) => text(readCell(row, nameAliases, index)))) {
      return { rows, columns, index, sheetName };
    }
  }
  return fallback ?? { rows: [], columns: [], index: new Map(), sheetName: workbook.SheetNames[0] };
};

/** What the reader could not make sense of, in words a person can act on. */
export const describeUnreadableSheet = (columns, wanted) =>
  `The sheet has no column this reader recognises as ${wanted}. It found: ` +
  `${columns.length ? columns.map((c) => `"${c}"`).join(", ") : "no columns at all"}. ` +
  `Download the template to see the columns it expects.`;

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
  const { rows, columns, index: cols } = findDataSheet(workbook, CATEGORY_ALIASES.name);

  return {
    columns,
    rows: rows.map((row, index) => ({
      rowNumber: index + 2, // +2: Excel is 1-indexed and row 1 is the header
      name: text(readCell(row, CATEGORY_ALIASES.name, cols)),
      nameAr: text(readCell(row, CATEGORY_ALIASES.nameAr, cols)),
      parentName: text(readCell(row, CATEGORY_ALIASES.parent, cols)),
      description: text(readCell(row, CATEGORY_ALIASES.description, cols)),
      descriptionAr: text(readCell(row, CATEGORY_ALIASES.descriptionAr, cols)),
      image: text(readCell(row, CATEGORY_ALIASES.image, cols)),
      order: Number.parseInt(readCell(row, CATEGORY_ALIASES.order, cols), 10) || 0,
      active: parseBool(readCell(row, CATEGORY_ALIASES.active, cols)),
    })),
  };
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

// Comma by default — tags are written that way. Features come pipe-separated
// on the shop's export, because a feature line may itself contain a comma.
const splitList = (value, separator = ",") =>
  text(value)
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean);

export const parseStudentProductExcel = (fileBuffer) => {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const { rows, columns, index: cols } = findDataSheet(workbook, PRODUCT_ALIASES.name);

  return {
    columns,
    rows: rows.map((row, index) => {
      const price = Number.parseFloat(readCell(row, PRODUCT_ALIASES.price, cols));

      return {
        rowNumber: index + 2,
        name: text(readCell(row, PRODUCT_ALIASES.name, cols)),
        nameAr: text(readCell(row, CATEGORY_ALIASES.nameAr, cols)),
        departmentName: text(readCell(row, PRODUCT_ALIASES.department, cols)),
        // A blank price is not zero-by-mistake — it means "not priced yet",
        // which the importer treats as a success that needs following up.
        price: Number.isFinite(price) ? price : null,
        stock: Number.parseInt(readCell(row, PRODUCT_ALIASES.stock, cols), 10) || 0,
        sku: text(readCell(row, PRODUCT_ALIASES.sku, cols)),
        description: text(readCell(row, CATEGORY_ALIASES.description, cols)),
        descriptionAr: text(readCell(row, CATEGORY_ALIASES.descriptionAr, cols)),
        images: readImages(row, cols),
        tags: splitList(readCell(row, PRODUCT_ALIASES.tags, cols)),
        featured: parseBool(readCell(row, PRODUCT_ALIASES.featured, cols), false),
        active: parseBool(readCell(row, CATEGORY_ALIASES.active, cols)),

        // Present only when the sheet carries them, so a file written to this
        // template never blanks a field it simply has no column for.
        minOrderQty:
          Number.parseInt(readCell(row, PRODUCT_ALIASES.minOrderQty, cols), 10) || undefined,
        salePercentage:
          Number.parseFloat(readCell(row, PRODUCT_ALIASES.salePercentage, cols)) || undefined,
        saleActive: parseBool(readCell(row, PRODUCT_ALIASES.saleActive, cols), false),
        features: splitList(readCell(row, PRODUCT_ALIASES.features, cols), "|"),
        attributes: readPairs(readCell(row, PRODUCT_ALIASES.attributes, cols)),
        bulkPricing: String(readCell(row, PRODUCT_ALIASES.bulkPricing, cols) ?? "")
          .split("|")
          .map((part) => part.trim())
          .filter(Boolean)
          .map((part) => {
            const [minQty, unitPrice] = part.split(":").map((s) => s.trim());
            return { minQty: Number.parseInt(minQty, 10), unitPrice: Number.parseFloat(unitPrice) };
          })
          .filter((b) => b.minQty && Number.isFinite(b.unitPrice)),
        installation: parseBool(readCell(row, PRODUCT_ALIASES.installationOffered, cols), false)
          ? {
              offered: true,
              price: Number.parseFloat(readCell(row, PRODUCT_ALIASES.installationPrice, cols)) || 0,
              note: text(readCell(row, PRODUCT_ALIASES.installationNote, cols)),
              noteAr: text(readCell(row, PRODUCT_ALIASES.installationNoteAr, cols)),
            }
          : undefined,
      };
    }),
  };
};

/** The section's products, in the shape its own template reads back. */
export const exportStudentProductsToExcel = (products, departmentName) => {
  const workbook = XLSX.utils.book_new();

  const rows = products.map((p) => ({
    "Product Name": p.name || "",
    "Arabic Name": p.nameAr || "",
    Department: departmentName(p.category) || "",
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
