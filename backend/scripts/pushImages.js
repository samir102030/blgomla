/**
 * Push curated product images from image_map.json → MongoDB
 * Uses the completed 273-model image map to update all products.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });
import Product from "../models/product.model.js";

const imageMap = JSON.parse(
  readFileSync(join(__dirname, "../../products/image_map.json"), "utf-8")
);

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const products = await Product.find({ deleted: false });
  console.log(`📦 Found ${products.length} products in DB\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const product of products) {
    // Extract the base model from the product
    const modelAttr = product.attributes?.find((a) => a.name === "Model");
    const fullModel = modelAttr?.value || product.name;
    // Strip pack info for matching: "Deco X20(3-pack)" → "Deco X20"
    const baseModel = fullModel.split("(")[0].trim();

    // Try exact match first, then base model
    let imageUrl = imageMap[fullModel] || imageMap[baseModel];

    if (!imageUrl) {
      // Try matching by iterating through the map keys
      const mapKey = Object.keys(imageMap).find((k) => {
        const kBase = k.split("(")[0].trim();
        return (
          kBase === baseModel ||
          fullModel.includes(k) ||
          k.includes(baseModel)
        );
      });
      if (mapKey) imageUrl = imageMap[mapKey];
    }

    if (imageUrl) {
      const currentUrl = product.images?.[0]?.url;
      if (currentUrl === imageUrl) {
        skipped++;
        continue;
      }

      product.images = [{ url: imageUrl, alt: product.name }];
      await product.save();
      updated++;
      console.log(`  ✅ [${updated}] ${product.name}`);
    } else {
      notFound++;
      console.log(`  ❌ No image for: ${fullModel} (base: ${baseModel})`);
    }
  }

  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ Image push complete!`);
  console.log(`  🖼️  Updated:   ${updated}`);
  console.log(`  ⏭️  Unchanged: ${skipped}`);
  console.log(`  ❌ Not found:  ${notFound}`);
  console.log(`  📊 Total:      ${products.length}`);
  console.log(`${"═".repeat(50)}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ FATAL:", err);
  process.exit(1);
});
