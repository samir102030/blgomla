/**
 * Link brands to their categories based on existing product data.
 * Usage: node backend/scripts/linkBrandsCategories.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Brand from "../models/brand.model.js";
import Product from "../models/product.model.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected");

  const brands = await Brand.find({ deleted: false });
  for (const brand of brands) {
    const products = await Product.find({ brand: brand._id, deleted: false });
    const categoryIds = [
      ...new Set(
        products.map((p) => p.Category?.toString()).filter(Boolean)
      ),
    ];
    if (categoryIds.length > 0) {
      brand.categories = categoryIds;
      await brand.save();
      console.log(`  ✅ ${brand.name}: linked to ${categoryIds.length} categories`);
    }
  }

  console.log("Done");
  await mongoose.disconnect();
}

main().catch(console.error);
