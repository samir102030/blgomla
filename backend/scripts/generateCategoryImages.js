/**
 * Generate category images with Magnific (Mystic) and upload them to Cloudinary.
 *
 * By default operates on categories that are missing an image. Writes the
 * resulting Cloudinary URL to category.image unless --dry-run.
 *
 * Env: MAGNIFIC_API_KEY, CLOUDINARY_*, MONGO_URI.
 *
 * Usage:
 *   MAGNIFIC_API_KEY=... node scripts/generateCategoryImages.js --limit=1 --dry-run   # POC
 *   MAGNIFIC_API_KEY=... node scripts/generateCategoryImages.js                        # backfill missing
 *   MAGNIFIC_API_KEY=... node scripts/generateCategoryImages.js --all                  # include ones with images
 */
import "dotenv/config";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import Category from "../models/category.model.js";
import { generateImage } from "../utils/magnific.js";

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}`));
  if (!hit) return undefined;
  const [, val] = hit.split("=");
  return val ?? true;
};

const DRY_RUN = !!arg("dry-run");
const ALL = !!arg("all");
const LIMIT = arg("limit") ? parseInt(arg("limit"), 10) : Infinity;

const promptFor = (name) =>
  `Professional e-commerce catalog image representing the "${name}" category for an IT, networking and technology store. A clean, modern composition centered on a seamless white background, soft studio lighting, crisp focus, high detail. Unbranded device with blank, plain surfaces and absolutely no lettering, no text, no labels, no watermarks, no logos.`;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing");
  if (!process.env.MAGNIFIC_API_KEY) throw new Error("MAGNIFIC_API_KEY missing");

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected (${DRY_RUN ? "DRY-RUN" : "APPLY"}) cloud=${cloudinary.config().cloud_name}`);

  const filter = ALL
    ? {}
    : { $or: [{ image: { $exists: false } }, { image: "" }, { image: null }] };
  const categories = await Category.find(filter).sort({ name: 1 }).lean();
  const targets = categories.slice(0, LIMIT);

  console.log(`Categories to process: ${targets.length} (of ${categories.length} matched)\n`);

  let done = 0;
  let failed = 0;
  for (const cat of targets) {
    try {
      console.log(`→ ${cat.name}`);
      const magnificUrl = await generateImage({
        prompt: promptFor(cat.name),
        aspectRatio: "square_1_1",
        resolution: "2k",
        model: "realism",
      });
      console.log(`   generated: ${magnificUrl}`);

      const uploaded = await cloudinary.uploader.upload(magnificUrl, {
        folder: "belgomla/categories",
        public_id: `cat-${cat._id}`,
        overwrite: true,
      });
      console.log(`   cloudinary: ${uploaded.secure_url}`);

      if (!DRY_RUN) {
        await Category.updateOne({ _id: cat._id }, { $set: { image: uploaded.secure_url } });
        console.log(`   ✓ saved to category.image`);
      } else {
        console.log(`   (dry-run — not saved)`);
      }
      done++;
    } catch (err) {
      failed++;
      console.error(`   ✗ ${cat.name}: ${err.message}`);
    }
  }

  console.log(`\nDone: ${done}, Failed: ${failed}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
