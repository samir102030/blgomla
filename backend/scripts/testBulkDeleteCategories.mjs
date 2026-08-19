/**
 * Checks the endpoint behind bulk category delete, and the branch behaviour the
 * page relies on. Temporary data, cleaned up at the end.
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

const mkCat = async (name, parent = null) => {
  const c = new Category({ name, parentCategory: parent, showInMenu: true });
  await c.save();
  made.cats.push(c._id);
  return c;
};

let failures = 0;
const check = (label, actual, expected) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: ${actual}${ok ? "" : ` (expected ${expected})`}`);
};

try {
  const root = await mkCat("ZZ Bulk Root");
  const mid = await mkCat("ZZ Bulk Mid", root._id);
  const leaf = await mkCat("ZZ Bulk Leaf", mid._id);
  const other = await mkCat("ZZ Bulk Other");

  const p = new Product({ name: "ZZ bulk product", price: 10, stock: 1, category: leaf._id });
  await p.save();
  made.products.push(p._id);

  const del = (id, c = cookie) =>
    fetch(`${BASE}/categories/safeDelete/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", cookie: c },
    }).then((r) => r.status);

  console.log("auth:");
  const anon = await fetch(`${BASE}/categories/safeDelete/${other._id}`, { method: "PUT" });
  check("rejected without a session", anon.status, 401);

  console.log("\ndeepest-first deletion of a branch:");
  check("leaf deleted", await del(leaf._id), 200);
  check("mid deleted", await del(mid._id), 200);
  check("root deleted", await del(root._id), 200);

  const stillThere = await Category.countDocuments({
    _id: { $in: [root._id, mid._id, leaf._id] },
    deleted: true,
  });
  check("all three flagged deleted", stillThere, 3);
  check(
    "none actually removed from the collection",
    await Category.countDocuments({ _id: { $in: [root._id, mid._id, leaf._id] } }),
    3
  );

  console.log("\nwhat happens to the products:");
  const survivor = await Product.findById(p._id).lean();
  check("product still exists", Boolean(survivor), true);
  check("product still points at the deleted category", String(survivor.category), String(leaf._id));

  console.log("\nunknown id:");
  check("404", await del(new mongoose.Types.ObjectId()), 404);

  console.log("\nrestore:");
  const restore = await fetch(`${BASE}/categories/restore/${leaf._id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", cookie },
  });
  check("restores", restore.status, 200);
  check(
    "and is live again",
    (await Category.findById(leaf._id).lean()).deleted,
    false
  );
} finally {
  await Product.deleteMany({ _id: { $in: made.products } });
  await Category.deleteMany({ _id: { $in: made.cats } });
  console.log(`\ncleaned up ${made.products.length} products, ${made.cats.length} categories`);
  console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILED`);
  await mongoose.disconnect();
  process.exit(failures === 0 ? 0 : 1);
}
