/**
 * Step 1: Remove fake/seed products, keep only PDF-sourced ones
 * Step 2: Add real product images from manufacturer websites
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });

import Product from "../models/product.model.js";

// ── TP-Link image URL builder ──
function tplinkImage(model) {
  // TP-Link uses consistent CDN URLs
  const base = model.split("(")[0].trim();
  const slug = base.replace(/\s+/g, "-");
  return `https://static.tp-link.com/upload/image-line/${slug}_normal_300x300.jpg`;
}

// ── Manual image map for known products ──
const TPLINK_IMAGES = {};

// Deco series
for (const m of ["Deco X20","Deco X10","Deco S7","Deco M5","Deco M4","Deco E4"]) {
  TPLINK_IMAGES[m] = `https://static.tp-link.com/upload/image-line/${m.replace(" ","-")}_normal_300x300.jpg`;
}
TPLINK_IMAGES["Deco X50-DSL"] = "https://static.tp-link.com/upload/image-line/Deco-X50-DSL_normal_300x300.jpg";

// Archer routers
const archerModels = ["AX53","AX23","AX10","AX12","C86","C80","C6","A6","C64","C60","C50","C54","C20","C24","MR200","MR402","VR2100","VR300","VR400","VR600","T2E","T4E","TX10E","TX55E"];
for (const m of archerModels) {
  TPLINK_IMAGES[`Archer ${m}`] = `https://static.tp-link.com/upload/image-line/Archer-${m}_normal_300x300.jpg`;
}

// TL- series
const tlModels = ["WR841N","WR840N","WR844N","WR820N","WR1502X","WR3002X","MR3020","MR3420","MR6400",
  "WA3001","WA1801","WA1201","WA801N","WA850RE","WA855RE",
  "WN722N","WN725N","WN781ND","WN822N","WN823N","WN881ND",
  "SF1005LP","SF1005P","SF1006P","SF1008LP","SF1008P","SF1009P","SF1016D","SF1024D","SF1024M","SF1048",
  "SG1005LP","SG1005P","SG1005P-PD","SG1006PP","SG1008MP","SG1008P","SG1016D","SG1016PE","SG1024D","SG1048",
  "SG105PP-M2","SG108PE","SG116","SG116P","SG1210MP","SG1210P","SG1210PP","SG1218MP","SG1218MPE","SG1428PE",
  "SL1218MP","SL1218P","SL1226P","SL1311MP","SL1311P","WPA4220 KIT"];
for (const m of tlModels) {
  TPLINK_IMAGES[`TL-${m}`] = `https://static.tp-link.com/upload/image-line/TL-${m}_normal_300x300.jpg`;
}

// LS series
const lsModels = ["LS1005","LS1005G","LS1008","LS1008G","LS1016G","LS1024G","LS105GP","LS105LP","LS106LP","LS106P","LS109P","LS110P","LS1210GP","LS1210P"];
for (const m of lsModels) {
  TPLINK_IMAGES[m] = `https://static.tp-link.com/upload/image-line/${m}_normal_300x300.jpg`;
}

// USB adapters
const usbModels = ["UB400","UB4A","UB500","UB500 Plus","UB5A","UC400","UE200","UE300","UE300C","UE306","UE330","UE330C","UH400","UH6120C","UH700","UH7020C","UH720","UH9120C"];
for (const m of usbModels) {
  TPLINK_IMAGES[m] = `https://static.tp-link.com/upload/image-line/${m.replace(" ","-")}_normal_300x300.jpg`;
}

// Archer USB adapters
const archerUsb = ["T2U Nano","T2UB Nano","T3U","T4U Plus","T600U Nano","TX10UB Nano","TX1U Nano","TX20U","TX20U Nano","TX20UH","TX35U Plus","TX50U","TX50UH"];
for (const m of archerUsb) {
  TPLINK_IMAGES[`Archer ${m}`] = `https://static.tp-link.com/upload/image-line/Archer-${m.replace(/ /g,"-")}_normal_300x300.jpg`;
}

// Mobile Wi-Fi & misc
for (const m of ["M7200","M7350","M7450","TD-W9950","TG-3468","TX301","RE200","RE205","RE315","RE450","RE505X","RE705X"]) {
  TPLINK_IMAGES[m] = `https://static.tp-link.com/upload/image-line/${m}_normal_300x300.jpg`;
}

function getTPLinkImageUrl(model) {
  const base = model.split("(")[0].trim();
  if (TPLINK_IMAGES[base]) return TPLINK_IMAGES[base];
  return tplinkImage(model);
}

// ── Hikvision image builder ──
function getHikvisionImageUrl(model) {
  const base = model.split("(")[0].trim();
  return `https://www.hikvision.com/content/dam/hikvision/products/${base}/${base}_product.png`;
}

// ── Megatop - use a generic rack image ──
function getMegatopImageUrl(model) {
  return "https://m.media-amazon.com/images/I/51jKKQ5VpQL._AC_SL1000_.jpg";
}

function getImageUrl(brand, model) {
  switch(brand) {
    case "TP-Link": return getTPLinkImageUrl(model);
    case "Hikvision": return getHikvisionImageUrl(model);
    case "Megatop": return getMegatopImageUrl(model);
    default: return "";
  }
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Step 1: Delete fake/seed products (not from PDFs)
  // PDF products have brands: TP-Link, Hikvision, Megatop
  // PDF products have attributes with Model field
  const pdfBrands = await mongoose.connection.db.collection("brands").find({
    name: { $in: ["TP-Link", "Hikvision", "Megatop"] }
  }).toArray();
  const pdfBrandIds = pdfBrands.map(b => b._id);
  console.log(`📋 PDF brand IDs: ${pdfBrandIds.map(id => id.toString()).join(", ")}`);

  // Delete products NOT in PDF brands
  const deleteResult = await Product.deleteMany({
    $or: [
      { brand: { $nin: pdfBrandIds } },
      { brand: null },
      { brand: { $exists: false } },
    ]
  });
  console.log(`🗑️  Deleted ${deleteResult.deletedCount} fake/seed products`);

  // Step 2: Update remaining products with real images
  const products = await Product.find({ deleted: false });
  console.log(`📦 Found ${products.length} PDF products to update`);

  let updated = 0;
  let failed = 0;

  for (const product of products) {
    const modelAttr = product.attributes?.find(a => a.name === "Model");
    const model = modelAttr?.value || product.name.replace(/^TP-Link\s+/, "").replace(/^Hikvision\s+/, "");
    
    // Find brand name
    const brand = pdfBrands.find(b => b._id.toString() === product.brand?.toString());
    const brandName = brand?.name || "Unknown";

    const imageUrl = getImageUrl(brandName, model);
    
    if (imageUrl) {
      product.images = [{ url: imageUrl, alt: product.name }];
      await product.save();
      updated++;
    } else {
      failed++;
      console.log(`  ⚠️ No image for: ${product.name}`);
    }
  }

  console.log(`\n✅ Done! Updated ${updated} products, ${failed} failed`);
  console.log(`📊 Total products in DB: ${await Product.countDocuments({})}`);
  
  await mongoose.disconnect();
}

main().catch(err => { console.error("❌ Error:", err); process.exit(1); });
