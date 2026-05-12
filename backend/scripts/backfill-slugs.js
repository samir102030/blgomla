/**
 * Backfill Script — Run once after model update
 * 
 * Fixes:
 * 1. Renames "Category" field → "category" on all product documents
 * 2. Generates slugs for products that don't have one
 * 3. Generates SKUs for products that don't have one
 * 4. Generates slugs for brands that don't have one
 * 5. Backfills level + path on categories
 * 
 * Usage: node scripts/backfill-slugs.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI not found in .env");
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log("Connected to MongoDB");

const db = mongoose.connection.db;

// ─── 1. Rename Category → category on all products ───
console.log("\n=== Step 1: Renaming Category → category ===");
const renameResult = await db.collection("products").updateMany(
  { Category: { $exists: true } },
  { $rename: { Category: "category" } }
);
console.log(`  Renamed ${renameResult.modifiedCount} products`);

// ─── 2. Generate slugs for products ───
console.log("\n=== Step 2: Generating product slugs ===");
const products = await db.collection("products").find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }] }).toArray();
console.log(`  Found ${products.length} products without slugs`);

for (const product of products) {
  const baseSlug = (product.name || "product")
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = product._id.toString().slice(-4);
  const slug = `${baseSlug}-${suffix}`;

  await db.collection("products").updateOne(
    { _id: product._id },
    { $set: { slug } }
  );
}
console.log(`  Generated slugs for ${products.length} products`);

// ─── 3. Generate SKUs for products ───
console.log("\n=== Step 3: Generating product SKUs ===");
const noSku = await db.collection("products").find({ $or: [{ sku: { $exists: false } }, { sku: null }, { sku: "" }] }).toArray();
console.log(`  Found ${noSku.length} products without SKUs`);

for (const product of noSku) {
  const prefix = (product.name || "PRD")
    .substring(0, 3)
    .toUpperCase()
    .replace(/[^A-Z]/g, "X");
  const ts = product._id.toString().slice(-6).toUpperCase();
  const sku = `${prefix}-${ts}`;

  await db.collection("products").updateOne(
    { _id: product._id },
    { $set: { sku } }
  );
}
console.log(`  Generated SKUs for ${noSku.length} products`);

// ─── 4. Generate slugs for brands ───
console.log("\n=== Step 4: Generating brand slugs ===");
const brands = await db.collection("brands").find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }] }).toArray();
console.log(`  Found ${brands.length} brands without slugs`);

for (const brand of brands) {
  const slug = (brand.name || "brand")
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  await db.collection("brands").updateOne(
    { _id: brand._id },
    { $set: { slug } }
  );
}
console.log(`  Generated slugs for ${brands.length} brands`);

// ─── 5. Backfill category level + path ───
console.log("\n=== Step 5: Backfilling category level and path ===");
const categories = await db.collection("categories").find({}).toArray();
const catMap = new Map(categories.map((c) => [c._id.toString(), c]));

// First, generate slugs for categories without them
for (const cat of categories) {
  if (!cat.slug) {
    const slug = (cat.name || "category")
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    cat.slug = slug;
    await db.collection("categories").updateOne(
      { _id: cat._id },
      { $set: { slug } }
    );
  }
}

// Now compute level and path
function computeLevelAndPath(cat) {
  if (!cat.parentCategory) {
    return { level: 0, path: `/${cat.slug}` };
  }
  const parent = catMap.get(cat.parentCategory.toString());
  if (!parent) {
    return { level: 0, path: `/${cat.slug}` };
  }
  const parentLP = computeLevelAndPath(parent);
  return {
    level: parentLP.level + 1,
    path: `${parentLP.path}/${cat.slug}`,
  };
}

let catUpdated = 0;
for (const cat of categories) {
  const { level, path } = computeLevelAndPath(cat);
  await db.collection("categories").updateOne(
    { _id: cat._id },
    { $set: { level, path } }
  );
  catUpdated++;
}
console.log(`  Updated level/path for ${catUpdated} categories`);

// ─── Done ───
console.log("\n✅ Backfill complete!");
await mongoose.disconnect();
process.exit(0);
