/**
 * End-to-end check of the move-products endpoint, against temporary data.
 * Creates a small tree, exercises the endpoint, asserts, then removes it all.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "C:\\Users\\Crafted\\blgomla\\backend\\.env" });

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

const { default: Category } = await import(
  "file:///C:/Users/Crafted/blgomla/backend/models/category.model.js"
);
const { default: Product } = await import(
  "file:///C:/Users/Crafted/blgomla/backend/models/product.model.js"
);

await mongoose.connect(process.env.MONGO_URI);
const cookie = await login();
const made = { cats: [], products: [] };

const mkCat = async (name, parent = null) => {
  const c = new Category({ name, parentCategory: parent, showInMenu: true });
  await c.save();
  made.cats.push(c._id);
  return c;
};
const mkProduct = async (name, category) => {
  const p = new Product({ name, price: 100, stock: 5, category: category._id });
  await p.save();
  made.products.push(p._id);
  return p;
};

let failures = 0;
const check = (label, actual, expected) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: ${actual}${ok ? "" : ` (expected ${expected})`}`);
};

try {
  const src = await mkCat("ZZ Test Source");
  const child = await mkCat("ZZ Test Child", src._id);
  const dest = await mkCat("ZZ Test Destination");

  await mkProduct("ZZ direct product", src);
  await mkProduct("ZZ child product 1", child);
  await mkProduct("ZZ child product 2", child);

  const call = (body, id = src._id) =>
    fetch(`${BASE}/categories/${id}/move-products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: await r.json() }));

  console.log("dry run, subtree included:");
  let r = await call({ targetCategoryId: dest._id, includeSubcategories: true, dryRun: true });
  check("counts the whole branch", r.body.count, 3);
  check("wrote nothing", await Product.countDocuments({ category: dest._id }), 0);

  console.log("\ndry run, direct only:");
  r = await call({ targetCategoryId: dest._id, includeSubcategories: false, dryRun: true });
  check("counts only direct", r.body.count, 1);

  console.log("\nguards:");
  r = await call({ targetCategoryId: src._id });
  check("refuses same source and target", r.status, 400);
  r = await call({ targetCategoryId: child._id, includeSubcategories: true });
  check("refuses a target inside the source", r.status, 400);
  r = await call({});
  check("refuses a missing target", r.status, 400);
  r = await call({ targetCategoryId: new mongoose.Types.ObjectId() });
  check("refuses an unknown target", r.status, 404);

  console.log("\nunauthenticated:");
  const anon = await fetch(`${BASE}/categories/${src._id}/move-products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetCategoryId: dest._id }),
  });
  check("rejected without a session", anon.status, 401);

  console.log("\nreal move:");
  r = await call({ targetCategoryId: dest._id, includeSubcategories: true });
  check("reports what moved", r.body.moved, 3);
  check("destination holds them", await Product.countDocuments({ category: dest._id }), 3);
  check("source is empty", await Product.countDocuments({ category: src._id }), 0);
  check("child is empty", await Product.countDocuments({ category: child._id }), 0);

  console.log("\nmoving an empty category:");
  r = await call({ targetCategoryId: dest._id, includeSubcategories: true });
  check("moves nothing, does not error", r.body.moved, 0);
} finally {
  await Product.deleteMany({ _id: { $in: made.products } });
  await Category.deleteMany({ _id: { $in: made.cats } });
  console.log(`\ncleaned up ${made.products.length} products, ${made.cats.length} categories`);
  console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILED`);
  await mongoose.disconnect();
  process.exit(failures === 0 ? 0 : 1);
}
