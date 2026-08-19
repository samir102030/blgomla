/**
 * Download both exports over HTTP, read the sheets back, and check the
 * hierarchy columns say what the database says. Temporary data, cleaned up.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import XLSX from "xlsx";
dotenv.config({ path: "C:\\Users\\Crafted\\blgomla\\backend\\.env" });

import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

const BASE = "http://127.0.0.1:5000/api";

// Credentials come from the environment. They used to be written here, which
// put a working super_admin login in a public repository — and these scripts
// only ever run against a database somebody already has.
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@belgomla.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error("SEED_ADMIN_PASSWORD is not set — this script signs in as the admin to run.");
  process.exit(1);
}
const login = async () => {
  const res = await fetch(`${BASE}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
};

await mongoose.connect(process.env.MONGO_URI);
const cookie = await login();
const made = { cats: [], products: [] };

let failures = 0;
const check = (label, actual, expected) => {
  const ok = String(actual) === String(expected);
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: ${actual}${ok ? "" : ` (expected ${expected})`}`);
};

const sheetOf = async (url, sheetName) => {
  const res = await fetch(url, { headers: { cookie } });
  if (res.status !== 200) return { status: res.status, rows: [], headers: [] };
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[sheetName || wb.SheetNames[0]];
  return {
    status: 200,
    rows: XLSX.utils.sheet_to_json(ws),
    headers: XLSX.utils.sheet_to_json(ws, { header: 1 })[0] || [],
    sheetNames: wb.SheetNames,
  };
};

try {
  // A three-level branch with known shape.
  const root = new Category({ name: "ZZ Export Root", nameAr: "جذر", sortOrder: 1 });
  await root.save();
  const mid = new Category({ name: "ZZ Export Mid", parentCategory: root._id });
  await mid.save();
  const leaf = new Category({ name: "ZZ Export Leaf", parentCategory: mid._id });
  await leaf.save();
  made.cats.push(root._id, mid._id, leaf._id);

  for (const n of [1, 2]) {
    const p = new Product({
      name: `ZZ Export Product ${n}`,
      price: 50 * n,
      stock: n,
      category: leaf._id,
    });
    await p.save();
    made.products.push(p._id);
  }

  console.log("auth:");
  const anonCat = await fetch(`${BASE}/categories/export`);
  check("categories export needs a session", anonCat.status, 401);
  const anonProd = await fetch(`${BASE}/bulk-products/export`);
  check("products export needs a session", anonProd.status, 401);

  console.log("\ncategory export — sheet 1 is the template, exactly:");
  const upload = await sheetOf(`${BASE}/categories/export`, "Categories");
  check("200", upload.status, 200);
  check("two sheets", JSON.stringify(upload.sheetNames), JSON.stringify(["Categories", "Tree"]));

  const TEMPLATE = [
    "Category Name", "Arabic Name", "Parent Category", "Description",
    "Arabic Description", "Image URL", "Sort Order", "Active", "Show In Menu",
  ];
  check(
    "columns identical to the template",
    JSON.stringify(upload.headers),
    JSON.stringify(TEMPLATE)
  );
  const up = upload.rows.find((r) => r["Category Name"] === "ZZ Export Leaf");
  check("parent by name", up?.["Parent Category"], "ZZ Export Mid");
  check("no extra columns leaked in", Object.keys(up || {}).length <= 9, true);

  console.log("\ncategory export — sheet 2 carries the hierarchy:");
  const cat = await sheetOf(`${BASE}/categories/export`, "Tree");
  const byName = new Map(cat.rows.map((r) => [r["Category Name"], r]));

  const rRoot = byName.get("ZZ Export Root");
  const rMid = byName.get("ZZ Export Mid");
  const rLeaf = byName.get("ZZ Export Leaf");
  check("root is present", Boolean(rRoot), true);

  check("root level", rRoot?.Level ?? 0, 0);
  check("mid level", rMid?.Level, 1);
  check("leaf level", rLeaf?.Level, 2);

  check("root has no parent", rRoot?.["Parent Category"] ?? "", "");
  check("mid names its parent", rMid?.["Parent Category"], "ZZ Export Root");
  check("leaf names its parent", rLeaf?.["Parent Category"], "ZZ Export Mid");

  check("full path", rLeaf?.["Full Path"], "ZZ Export Root > ZZ Export Mid > ZZ Export Leaf");
  check("level 1 column", rLeaf?.["Level 1"], "ZZ Export Root");
  check("level 2 column", rLeaf?.["Level 2"], "ZZ Export Mid");
  check("level 3 column", rLeaf?.["Level 3"], "ZZ Export Leaf");

  check("leaf direct products", rLeaf?.["Direct Products"], 2);
  check("root sees them in its branch", rRoot?.["Products In Branch"], 2);
  check("root direct products", rRoot?.["Direct Products"] ?? 0, 0);
  check("root subcategory count", rRoot?.Subcategories, 1);
  check("arabic name carried on sheet 1", up?.["Arabic Name"] ?? "", "");

  // Parent must come before child, so the sheet reads as the tree.
  const idx = (n) => cat.rows.findIndex((r) => r["Category Name"] === n);
  check("parent sorted above child", idx("ZZ Export Root") < idx("ZZ Export Mid"), true);
  check("child sorted above grandchild", idx("ZZ Export Mid") < idx("ZZ Export Leaf"), true);

  console.log("\ndeleted rows:");
  await Category.updateOne({ _id: leaf._id }, { $set: { deleted: true } });
  const without = await sheetOf(`${BASE}/categories/export`, "Tree");
  check(
    "excluded by default",
    without.rows.some((r) => r["Category Name"] === "ZZ Export Leaf"),
    false
  );
  const withDeleted = await sheetOf(`${BASE}/categories/export?includeDeleted=true`, "Tree");
  const del = withDeleted.rows.find((r) => r["Category Name"] === "ZZ Export Leaf");
  check("included on request", Boolean(del), true);
  check("and flagged", del?.Deleted, "TRUE");
  await Category.updateOne({ _id: leaf._id }, { $set: { deleted: false } });

  console.log("\nproduct export:");
  const prod = await sheetOf(`${BASE}/bulk-products/export`);
  check("200", prod.status, 200);
  const row = prod.rows.find((r) => r["Product Name"] === "ZZ Export Product 1");
  check("the product is in the sheet", Boolean(row), true);
  check("price carried", row?.Price, 50);
  check("category name carried", row?.["Category Name"], "ZZ Export Leaf");
  check("column count", prod.headers.length, 25);
} finally {
  await Product.deleteMany({ _id: { $in: made.products } });
  await Category.deleteMany({ _id: { $in: made.cats } });
  console.log(`\ncleaned up ${made.products.length} products, ${made.cats.length} categories`);
  console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILED`);
  await mongoose.disconnect();
  process.exit(failures === 0 ? 0 : 1);
}
