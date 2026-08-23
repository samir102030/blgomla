/**
 * Move the product images onto our own Cloudinary account.
 *
 *   node scripts/migrateImagesToCloudinary.mjs --dry
 *   node scripts/migrateImagesToCloudinary.mjs --confirm --limit 200
 *   node scripts/migrateImagesToCloudinary.mjs --confirm
 *
 * Every image on the shop is a link to somebody else's server —
 * egyptlaptop.com for the general catalogue, free-electronic.com for the
 * electronics section. They load today. They load until one of those sites
 * reorganises its folders, blocks hotlinking, or goes away, and on that day the
 * shop loses its pictures and there is nothing to be done about it from here.
 *
 * Cloudinary fetches a remote URL itself, so nothing is downloaded through this
 * machine: each image is handed over by address and comes back as a URL we own.
 *
 * Safe to stop and re-run. An image already on res.cloudinary.com is skipped,
 * and the public_id is derived from the product and the position, so a repeat
 * of the same upload lands on the same asset instead of a second copy.
 *
 * --limit is the way to do this in bites. There are around 25,000 images, the
 * free plan bills storage and viewing bandwidth against a monthly allowance,
 * and finding that out at image 20,000 is worse than finding it out at 200.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Product from "../models/product.model.js";
import { ANY_AUDIENCE } from "../utils/electronicsVisibility.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const limitArg = args[args.indexOf("--limit") + 1];
const LIMIT = args.includes("--limit") && limitArg ? Number(limitArg) : Infinity;
const CONCURRENCY = 4;
const FOLDER = "belgomla/products";

if (!dry && !args.includes("--confirm")) {
  console.error("Refusing to upload without --confirm. Use --dry to see the plan.");
  process.exit(1);
}

const configured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (!dry && !configured) {
  console.error("CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must all be set.");
  process.exit(1);
}

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

await mongoose.connect(process.env.MONGO_URI);

const isOurs = (url) => /res\.cloudinary\.com/.test(String(url || ""));

// `audience` is not optional here. The product schema hides the electronics
// section from any query that does not mention it, so the plain find this used
// to be skipped 5,769 of the 25,660 images and then reported itself finished.
const products = await Product.find({
  audience: ANY_AUDIENCE,
  deleted: { $ne: true },
  "images.0": { $exists: true },
})
  .select("_id images")
  .lean();

const work = [];
for (const product of products) {
  product.images.forEach((image, index) => {
    if (!image?.url || isOurs(image.url) || !/^https?:\/\//.test(image.url)) return;
    work.push({ productId: product._id, index, url: image.url, alt: image.alt });
  });
}

console.log(`images to move: ${work.length}`);
if (!work.length) {
  await mongoose.disconnect();
  process.exit(0);
}

if (dry) {
  const byHost = {};
  for (const item of work) {
    const host = new URL(item.url).host;
    byHost[host] = (byHost[host] || 0) + 1;
  }
  console.log("by host:", JSON.stringify(byHost, null, 1));
  console.log(`would upload ${Math.min(work.length, LIMIT)} of them this run`);
  console.log(configured ? "(credentials present)" : "(no credentials — this is a plan only)");
  await mongoose.disconnect();
  process.exit(0);
}

const batch = work.slice(0, LIMIT);
let done = 0;
let failed = 0;
const failures = [];

const uploadOne = async (item) => {
  try {
    const result = await cloudinary.uploader.upload(item.url, {
      folder: FOLDER,
      // Same input, same asset. A re-run after an interruption costs nothing.
      public_id: `${item.productId}-${item.index}`,
      overwrite: false,
      resource_type: "image",
    });
    await Product.updateOne(
      { _id: item.productId },
      { $set: { [`images.${item.index}.url`]: result.secure_url } },
    );
    done += 1;
  } catch (error) {
    failed += 1;
    failures.push({ url: item.url, message: error?.message || String(error) });
  }
  const seen = done + failed;
  if (seen % 25 === 0 || seen === batch.length) {
    console.log(`  ${seen}/${batch.length}  moved ${done}  failed ${failed}`);
  }
};

// A small fixed pool. Cloudinary rate-limits, and the point of this script is
// that it finishes, not that it finishes fast.
const queue = [...batch];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item) await uploadOne(item);
    }
  }),
);

console.log(`\nmoved: ${done}`);
console.log(`failed: ${failed}`);
if (failures.length) {
  console.log("\nfirst failures:");
  failures.slice(0, 10).forEach((f) => console.log(`  ${f.message}  ${f.url}`));
}

const remaining = work.length - done;
if (remaining > 0) console.log(`\n${remaining} still on someone else's server — run again to continue.`);

await mongoose.disconnect();
