/**
 * Phase 5 — Replace the 70 unfixable Hikvision URLs with the 8 manually
 * sourced chassis photos.
 *
 * Prereq: drop these 8 files into products/manual_hikvision/
 *   NVR-black-1bay.png
 *   NVR-black-2bay.png
 *   NVR-black-4bay.png
 *   NVR-white-1bay.png
 *   NVR-white-2bay.png
 *   NVR-mini-X1.png
 *   IPC-bullet-white.png
 *   IPC-turret-white.png
 *
 * Mapping is deterministic from the model number:
 *   NVR drive bays: DS-76 04/7104     → 1bay
 *                   DS-7608 / DS-7616 → 1bay (Q1/K1) or 2bay (Q2/K2/NXI-K2/I2)
 *                   DS-7632           → 2bay
 *                   DS-7716/7732      → 4bay
 *   NVR color:      Q-series       -> white (Value series)
 *                   K/NXI/I-series -> black (Pro/Acusense)
 *   NVR mini:       any model with "/M" suffix -> mini X1
 *   IP cam shape:   2CD1*21/23/43 + 27G2H + T27/T47  -> turret/dome
 *                   everything else 2CD1             -> bullet
 *
 * Run:
 *   node backend/scripts/fixHikvisionImages.js          # dry-run
 *   node backend/scripts/fixHikvisionImages.js --apply  # upload + update DB
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const APPLY = process.argv.includes("--apply");
const MANUAL_DIR = join(__dirname, "../../products/manual_hikvision");
const FOLDER = "halafawy/manual_hikvision";

const FILES = [
  "NVR-black-1bay.png",
  "NVR-black-2bay.png",
  "NVR-black-4bay.png",
  "NVR-white-1bay.png",
  "NVR-white-2bay.png",
  "NVR-mini-X1.png",
  "IPC-bullet-white.png",
  "IPC-turret-white.png",
];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Hikvision IP camera turret models — second-to-last digit groups that
// indicate the dome/turret form factor. Everything else with DS-2CD1*
// is a bullet.
const TURRET_HINTS = [
  /DS-2CD1[1-9]\d{2}G/i,      // DS-2CD1121, 1123, 1143, 1163, 1183, 1321, 1323, 1343, 1347
  /DS-2CD1\d{2}7G2H-LIUF/i,   // DS-2CD1027G2H-LIUF, 1047, 1327, 1347, 1T27, 1T47
  /DS-2CD1T\d/i,              // DS-2CD1T27, DS-2CD1T47 (these are turret/wedge)
];

function classify(name) {
  const n = name.toUpperCase();
  // IP cameras first
  if (/DS-2CD\d/i.test(n)) {
    const isTurret = TURRET_HINTS.some((rx) => rx.test(n));
    return isTurret ? "IPC-turret-white.png" : "IPC-bullet-white.png";
  }
  // NVRs
  if (/DS-7\d{3}N/i.test(n)) {
    // Mini X1 — explicit /M suffix
    if (/\/M(\b|$|\/)/.test(n)) return "NVR-mini-X1.png";
    // Color: Q* = white, others = black
    const white = /-Q\d/.test(n);
    // Bay count: pull "K4", "I4", "Q2", "NXI-K2" etc.
    const bayMatch = n.match(/-(?:NXI-)?(?:[A-Z]+-)?(?:K|Q|I)(\d)(?:\/|\(|$)/);
    let bays = bayMatch ? parseInt(bayMatch[1], 10) : null;
    // 7104/7604 are always 1-bay regardless
    if (/DS-7[01]04N/.test(n)) bays = 1;
    // 7716/7732 are always 4-bay
    if (/DS-77\d{2}N/.test(n)) bays = 4;
    if (!bays) return null;
    return `NVR-${white ? "white" : "black"}-${bays}bay.png`;
  }
  return null;
}

async function uploadAll() {
  const urls = {};
  for (const file of FILES) {
    const path = join(MANUAL_DIR, file);
    if (!existsSync(path)) {
      throw new Error(`Missing ${file} in ${MANUAL_DIR}`);
    }
    const publicId = `${FOLDER}/${file.replace(/\.\w+$/, "")}`;
    if (APPLY) {
      const result = await cloudinary.uploader.upload(path, {
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
        use_filename: false,
        unique_filename: false,
        invalidate: true,
      });
      urls[file] = result.secure_url;
    } else {
      urls[file] = `https://res.cloudinary.com/${cloudinary.config().cloud_name}/image/upload/${publicId}`;
    }
    console.log(`  ✓ ${file} → ${urls[file]}`);
  }
  return urls;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const Product = (await import("../models/product.model.js")).default;
  console.log(`✅ Connected to ${mongoose.connection.db.databaseName}`);
  console.log(APPLY ? "🛠  Apply mode" : "🔎 Dry run (pass --apply)");

  console.log("\n— Uploading 8 master images —");
  const urls = await uploadAll();

  console.log("\n— Mapping affected products —");
  const products = await Product.find({
    "images.0.url": { $regex: "assets\\.hikvision\\.com" },
  });
  console.log(`Found ${products.length} products with broken Hikvision URLs.\n`);

  let updated = 0;
  let unmapped = 0;
  const unmappedList = [];
  for (const p of products) {
    const file = classify(p.name);
    if (!file) {
      unmapped++;
      unmappedList.push(p.name);
      console.log(`  ⚠️  no map: ${p.name}`);
      continue;
    }
    const newUrl = urls[file];
    console.log(`  ${file.padEnd(24)} ← ${p.name}`);
    if (APPLY) {
      p.images[0].url = newUrl;
      p.images[0].alt = p.name;
      await p.save();
    }
    updated++;
  }

  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`  Mapped + updated: ${updated}`);
  console.log(`  Unmapped:         ${unmapped}`);
  console.log(`══════════════════════════════════════════════════`);
  if (unmappedList.length) {
    console.log("\nUnmapped (need a manual rule):");
    unmappedList.forEach((n) => console.log("  - " + n));
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
