/**
 * Import real products from extracted PDF data into MongoDB.
 * 
 * This script:
 * 1. Creates brands (TP-Link, Hikvision, Megatop)
 * 2. Creates categories and subcategories  
 * 3. Imports all 289 products with proper references
 * 4. Cleans up seed/demo products first
 * 
 * Usage: node backend/scripts/importProducts.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from backend
dotenv.config({ path: join(__dirname, "../.env") });

// Import models
import Product from "../models/product.model.js";
import Brand from "../models/brand.model.js";
import Category from "../models/category.model.js";
import Store from "../models/store.model.js";

async function importProducts() {
  try {
    // Connect
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB Atlas");

    // Load JSON data
    const jsonPath = join(__dirname, "../../products/products_data.json");
    const rawData = JSON.parse(readFileSync(jsonPath, "utf-8"));
    console.log(`📄 Loaded ${rawData.length} products from JSON`);

    // Get the store (use first approved store for product ownership)
    let store = await Store.findOne({ status: "approved" });
    if (!store) {
      console.log("⚠️  No approved store found, products will have no store");
    } else {
      console.log(`🏪 Using store: ${store.storeName} (${store._id})`);
    }

    // ── Step 1: Create/Update Brands ──
    console.log("\n━━━ Creating Brands ━━━");
    const brandNames = [...new Set(rawData.map((p) => p.brand))];
    const brandMap = {};

    for (const name of brandNames) {
      let brand = await Brand.findOne({ name });
      if (!brand) {
        brand = await Brand.create({
          name,
          description: `${name} products`,
          isActive: true,
          deleted: false,
        });
        console.log(`  ✅ Created brand: ${name}`);
      } else {
        console.log(`  ⏭️  Brand exists: ${name}`);
      }
      brandMap[name] = brand._id;
    }

    // ── Step 2: Create/Update Categories ──
    console.log("\n━━━ Creating Categories ━━━");
    const parentCategories = [...new Set(rawData.map((p) => p.parentCategory))];
    const subCategories = [...new Set(rawData.map((p) => p.category))];
    const categoryMap = {};

    // Create parent categories first
    for (const name of parentCategories) {
      let cat = await Category.findOne({ name });
      if (!cat) {
        cat = await Category.create({
          name,
          description: `${name} products`,
          slug: name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"),
          isActive: true,
          deleted: false,
        });
        console.log(`  ✅ Created parent category: ${name}`);
      } else {
        console.log(`  ⏭️  Parent category exists: ${name}`);
      }
      categoryMap[name] = cat._id;
    }

    // Create subcategories
    for (const name of subCategories) {
      if (categoryMap[name]) continue; // Skip if already a parent

      // Find which parent this subcategory belongs to
      const product = rawData.find((p) => p.category === name);
      const parentName = product?.parentCategory;
      const parentId = parentName ? categoryMap[parentName] : null;

      let cat = await Category.findOne({ name });
      if (!cat) {
        cat = await Category.create({
          name,
          description: `${name} products`,
          slug: name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"),
          parentCategory: parentId,
          isActive: true,
          deleted: false,
        });
        console.log(`  ✅ Created subcategory: ${name} → ${parentName || "none"}`);

        // Link to parent's subCategories array
        if (parentId) {
          await Category.findByIdAndUpdate(parentId, {
            $addToSet: { subCategories: cat._id },
          });
        }
      } else {
        console.log(`  ⏭️  Subcategory exists: ${name}`);
      }
      categoryMap[name] = cat._id;
    }

    // ── Step 3: Remove old demo/seed products ──
    console.log("\n━━━ Cleaning up old seed data ━━━");
    const deletedCount = await Product.deleteMany({
      $or: [
        { name: /^(iPhone|Samsung|Sony|MacBook|Dell|Canon|Bose|Nike|Dyson|KitchenAid|Lenovo|LG|RTX|Corsair|Razer)/i },
        { tags: { $in: ["demo", "seed"] } },
      ],
    });
    console.log(`  🗑️  Removed ${deletedCount.deletedCount} old demo products`);

    // ── Step 4: Import Products ──
    console.log("\n━━━ Importing Products ━━━");
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of rawData) {
      try {
        // Match by name only — model codes are not unique in the source
        // PDFs (e.g. OM-RK6U-MT exists as both wall-mount and floor-standing
        // with different prices), but names already disambiguate by size.
        const existing = await Product.findOne({ name: item.name });

        if (existing) {
          // Update price and stock
          existing.price = item.price;
          existing.stock = item.stock;
          await existing.save();
          skipped++;
          continue;
        }

        const product = await Product.create({
          name: item.name,
          description: item.description || "",
          price: item.price,
          Category: categoryMap[item.category] || categoryMap[item.parentCategory] || null,
          brand: brandMap[item.brand] || null,
          stock: item.stock,
          images: [], // No images yet — will be added later
          isActive: true,
          deleted: false,
          approvalStatus: "approved",
          approvedAt: new Date(),
          featured: false,
          tags: item.tags || [],
          features: item.features || [],
          attributes: [
            { name: "Model", value: item.model },
            { name: "Brand", value: item.brand },
          ],
          store: store?._id || null,
          soldCount: 0,
          salePercentage: 0,
          saleActive: false,
        });

        created++;
      } catch (err) {
        if (err.code === 11000) {
          skipped++;
        } else {
          errors++;
          console.error(`  ❌ Error importing ${item.name}: ${err.message}`);
        }
      }
    }

    console.log(`\n${"═".repeat(50)}`);
    console.log(`📦 Import Complete!`);
    console.log(`  ✅ Created: ${created}`);
    console.log(`  ⏭️  Updated/Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📊 Total products in DB: ${await Product.countDocuments({ deleted: false })}`);
    console.log(`  🏷️  Total brands: ${await Brand.countDocuments({ deleted: false })}`);
    console.log(`  📂 Total categories: ${await Category.countDocuments({ deleted: false })}`);

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

importProducts();
