/**
 * Migrate broken external image URLs → Cloudinary.
 *
 * TP-Link's CDN now returns 403 when Referer matches our site
 * (hotlink protection). Hikvision is unreliable. Upload every
 * static.tp-link.com / assets.hikvision.com product image to our
 * own Cloudinary account, then update the product docs and the
 * products_data.json / products/image_map.json files so re-seeding
 * doesn't reintroduce the broken URLs.
 *
 * Usage:
 *   node backend/scripts/migrateBrokenImages.js          # dry-run
 *   node backend/scripts/migrateBrokenImages.js --apply  # actually upload + write
 *
 * Notes:
 *   - Cloudinary's uploader can fetch a remote URL directly, so no
 *     temp-dir download dance is needed.
 *   - We pass a stable public_id derived from the product slug so
 *     re-running is idempotent (Cloudinary returns the existing
 *     asset instead of duplicating).
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, createWriteStream } from "fs";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import https from "https";
import { pipeline } from "stream/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const APPLY = process.argv.includes("--apply");
const BROKEN_HOSTS = ["static.tp-link.com", "assets.hikvision.com"];
const FOLDER = "halafawy/products";

const PRODUCTS_DATA = join(__dirname, "../../products/products_data.json");
const IMAGE_MAP = join(__dirname, "../../products/image_map.json");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function isBroken(url) {
  return BROKEN_HOSTS.some((h) => url?.includes(h));
}

// Cloudinary public_id allows letters/digits/-/_/./~ — anything else
// (including non-ASCII, %20 etc.) is safer to strip.
function publicIdFor(product) {
  const base = product.slug || product._id.toString();
  return `${FOLDER}/${base.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

// Cloudinary's fetcher gets 403 from Hikvision (the CDN blocks
// Cloudinary's IPs). Fallback: download with a browser-style UA, then
// upload the local file.
function downloadToFile(url, dest) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          Accept: "image/*,*/*",
        },
        timeout: 30000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Follow one redirect
          downloadToFile(res.headers.location, dest).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} from ${url}`));
          res.resume();
          return;
        }
        pipeline(res, createWriteStream(dest)).then(resolve, reject);
      }
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("timeout")));
  });
}

async function uploadOne(url, publicId, tmpDir) {
  try {
    return await cloudinary.uploader.upload(url, {
      public_id: publicId,
      overwrite: false,
      resource_type: "image",
      use_filename: false,
      unique_filename: false,
      invalidate: false,
    });
  } catch (err) {
    const status = err?.http_code || err?.error?.http_code;
    if (status !== 400 && !/403/.test(err?.message || "")) throw err;
    // Fallback: download then upload from disk.
    const filePath = join(tmpDir, `${publicId.replace(/\//g, "_")}.bin`);
    await downloadToFile(url, filePath);
    return cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      overwrite: false,
      resource_type: "image",
      use_filename: false,
      unique_filename: false,
      invalidate: false,
    });
  }
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const Product = (await import("../models/product.model.js")).default;
  console.log(`✅ Connected to ${mongoose.connection.db.databaseName}`);
  console.log(APPLY ? "🛠  Apply mode" : "🔎 Dry run (pass --apply)");
  console.log(`📦 Cloud: ${cloudinary.config().cloud_name}\n`);

  // Build a re-usable map: old URL → new URL. Same image is sometimes
  // reused across products (image_map.json), so the same upload result
  // can be applied to many products without re-uploading.
  const urlCache = new Map();
  const tmpDir = mkdtempSync(join(tmpdir(), "halafawy-img-"));

  const products = await Product.find({
    "images.0.url": {
      $regex: BROKEN_HOSTS.map((h) => h.replace(/\./g, "\\.")).join("|"),
    },
  });
  console.log(`Found ${products.length} products with broken images.\n`);

  let uploaded = 0;
  let reused = 0;
  let failed = 0;
  const updates = [];

  for (const product of products) {
    const oldUrl = product.images?.[0]?.url;
    if (!oldUrl || !isBroken(oldUrl)) continue;

    let newUrl = urlCache.get(oldUrl);

    if (!newUrl) {
      const publicId = publicIdFor(product);
      try {
        if (APPLY) {
          const result = await uploadOne(oldUrl, publicId, tmpDir);
          newUrl = result.secure_url;
        } else {
          newUrl = `https://res.cloudinary.com/${cloudinary.config().cloud_name}/image/upload/${publicId}`;
        }
        urlCache.set(oldUrl, newUrl);
        uploaded++;
        console.log(`  [${uploaded}] ${product.name} → ${newUrl}`);
      } catch (err) {
        failed++;
        console.log(`  ❌ ${product.name}: ${err.message}`);
        continue;
      }
    } else {
      reused++;
    }

    updates.push({ id: product._id, oldUrl, newUrl, name: product.name });
    if (APPLY) {
      product.images[0].url = newUrl;
      await product.save();
    }
  }

  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`  Uploaded:     ${uploaded}`);
  console.log(`  Reused cache: ${reused}`);
  console.log(`  Failed:       ${failed}`);
  console.log(`  DB updates:   ${updates.length}`);
  console.log(`══════════════════════════════════════════════════\n`);

  if (APPLY && updates.length) {
    // Update products_data.json
    if (existsSync(PRODUCTS_DATA)) {
      const data = JSON.parse(readFileSync(PRODUCTS_DATA, "utf-8"));
      let touched = 0;
      const urlMap = Object.fromEntries(updates.map((u) => [u.oldUrl, u.newUrl]));
      const walk = (node) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (node && typeof node === "object") {
          for (const k of Object.keys(node)) {
            const v = node[k];
            if (typeof v === "string" && urlMap[v]) {
              node[k] = urlMap[v];
              touched++;
            } else if (typeof v === "object") {
              walk(v);
            }
          }
        }
      };
      walk(data);
      writeFileSync(PRODUCTS_DATA, JSON.stringify(data, null, 2));
      console.log(`📝 products_data.json: ${touched} URLs rewritten`);
    }

    // Update image_map.json
    if (existsSync(IMAGE_MAP)) {
      const map = JSON.parse(readFileSync(IMAGE_MAP, "utf-8"));
      let touched = 0;
      const urlMap = Object.fromEntries(updates.map((u) => [u.oldUrl, u.newUrl]));
      for (const k of Object.keys(map)) {
        if (urlMap[map[k]]) {
          map[k] = urlMap[map[k]];
          touched++;
        }
      }
      writeFileSync(IMAGE_MAP, JSON.stringify(map, null, 2));
      console.log(`📝 image_map.json:     ${touched} URLs rewritten`);
    }
  }

  rmSync(tmpDir, { recursive: true, force: true });
  await mongoose.disconnect();
  process.exit(failed > 0 && APPLY ? 1 : 0);
}

main().catch((err) => {
  console.error("❌ FATAL:", err);
  process.exit(1);
});
