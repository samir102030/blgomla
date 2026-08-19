/**
 * Export, upload the exported file back unchanged, and check nothing changed.
 *
 * The claim both exports make is that a download can be edited and re-uploaded.
 * That claim is only worth anything if the file the export writes is one the
 * importer actually accepts, and the failure mode when it isn't — duplicated
 * rows, or fields silently blanked because a column went missing — is invisible
 * until someone notices their Arabic names are gone.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "C:\\Users\\Crafted\\blgomla\\backend\\.env" });

import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

const BASE = "http://127.0.0.1:5000/api";
const login = async () => {
  const res = await fetch(`${BASE}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@belgomla.com", password: "Admin@123" }),
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

const download = async (url) => {
  const res = await fetch(url, { headers: { cookie } });
  return Buffer.from(await res.arrayBuffer());
};

const upload = async (url, buffer, filename) => {
  const form = new FormData();
  form.append(
    "file",
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename
  );
  const res = await fetch(url, { method: "POST", headers: { cookie }, body: form });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

try {
  const root = new Category({ name: "ZZ RT Root", nameAr: "جذر تجريبي", sortOrder: 3 });
  await root.save();
  const leaf = new Category({
    name: "ZZ RT Leaf",
    nameAr: "ورقة تجريبية",
    parentCategory: root._id,
  });
  await leaf.save();
  made.cats.push(root._id, leaf._id);

  const product = new Product({
    name: "ZZ RT Product",
    nameAr: "منتج تجريبي",
    sku: "ZZ-RT-001",
    price: 123,
    stock: 7,
    minOrderQty: 3,
    category: leaf._id,
    installation: { offered: true, price: 50, note: "fitting", noteAr: "تركيب" },
  });
  await product.save();
  made.products.push(product._id);

  const catsBefore = await Category.countDocuments({});
  const prodsBefore = await Product.countDocuments({});

  // ── categories ─────────────────────────────────────────────────────────
  console.log("categories: export → upload the same file back");
  const catFile = await download(`${BASE}/categories/export`);
  const catUp = await upload(`${BASE}/categories/bulk-upload`, catFile, "categories.xlsx");
  check("upload accepted", catUp.status, 200);

  const catsAfter = await Category.countDocuments({});
  check("no categories duplicated", catsAfter, catsBefore);

  const rootAfter = await Category.findById(root._id).lean();
  const leafAfter = await Category.findById(leaf._id).lean();
  check("arabic name survived", rootAfter?.nameAr, "جذر تجريبي");
  check("sort order survived", rootAfter?.sortOrder, 3);
  check("parent survived", String(leafAfter?.parentCategory), String(root._id));

  // ── products ───────────────────────────────────────────────────────────
  console.log("\nproducts: export → upload the same file back");
  const prodFile = await download(`${BASE}/bulk-products/export`);
  const prodUp = await upload(`${BASE}/bulk-products/upload`, prodFile, "products.xlsx");
  check("upload accepted", prodUp.status, 200);

  const prodsAfter = await Product.countDocuments({});
  check("no products duplicated", prodsAfter, prodsBefore);

  const after = await Product.findById(product._id).lean();
  check("price survived", after?.price, 123);
  check("stock survived", after?.stock, 7);
  check("arabic name survived", after?.nameAr, "منتج تجريبي");
  check("sku survived", after?.sku, "ZZ-RT-001");
  check("min order qty survived", after?.minOrderQty, 3);
  check("installation survived", after?.installation?.offered, true);
  check("installation price survived", after?.installation?.price, 50);
  check("category survived", String(after?.category), String(leaf._id));
} finally {
  await Product.deleteMany({ _id: { $in: made.products } });
  await Product.deleteMany({ name: /^ZZ RT / });
  await Category.deleteMany({ _id: { $in: made.cats } });
  await Category.deleteMany({ name: /^ZZ RT / });
  console.log(`\ncleaned up`);
  console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILED`);
  await mongoose.disconnect();
  process.exit(failures === 0 ? 0 : 1);
}
