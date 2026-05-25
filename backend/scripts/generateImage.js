/**
 * Generic Magnific (Mystic) image generator → Cloudinary.
 *
 * Generates one or more images from a text prompt, uploads each to Cloudinary,
 * and prints the permanent secure URLs. Use it to produce mosaic-card images
 * and ad/banner creatives, then paste the URL(s) into the admin modal.
 *
 * No DB writes — it only generates + uploads + prints.
 *
 * Env: MAGNIFIC_API_KEY, CLOUDINARY_*.
 *
 * Usage:
 *   # Hero ad banner (wide)
 *   MAGNIFIC_API_KEY=... node scripts/generateImage.js \
 *     --prompt="Vibrant tech sale banner, routers and networking gear, bold lighting" \
 *     --aspect=widescreen_16_9 --folder=belgomla/ads
 *
 *   # Mosaic single card (4:3) — 3 variations to choose from
 *   MAGNIFIC_API_KEY=... node scripts/generateImage.js \
 *     --prompt="Smart home networking lifestyle scene, clean and modern" \
 *     --aspect=classic_4_3 --count=3 --folder=belgomla/mosaic
 *
 * Flags:
 *   --prompt=     (required) text prompt
 *   --aspect=     aspect_ratio (default square_1_1; e.g. widescreen_16_9, classic_4_3)
 *   --resolution= 1k | 2k | 4k   (default 2k)
 *   --model=      zen|flexible|fluid|realism|super_real|editorial_portraits (default realism)
 *   --count=      how many images to generate (default 1)
 *   --folder=     Cloudinary folder (default belgomla/generated)
 */
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { generateImage } from "../utils/magnific.js";

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
};

const prompt = arg("prompt");
const aspectRatio = arg("aspect", "square_1_1");
const resolution = arg("resolution", "2k");
const model = arg("model", "realism");
const count = parseInt(arg("count", "1"), 10) || 1;
const folder = arg("folder", "belgomla/generated");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const run = async () => {
  if (!prompt) throw new Error("--prompt is required");
  if (!process.env.MAGNIFIC_API_KEY) throw new Error("MAGNIFIC_API_KEY missing");

  console.log(
    `Generating ${count} image(s) | aspect=${aspectRatio} res=${resolution} model=${model}\n  prompt: ${prompt}\n`
  );

  const urls = [];
  for (let i = 0; i < count; i++) {
    try {
      const magnificUrl = await generateImage({ prompt, aspectRatio, resolution, model });
      const uploaded = await cloudinary.uploader.upload(magnificUrl, {
        folder,
        overwrite: false,
      });
      console.log(`[${i + 1}/${count}] ${uploaded.secure_url}`);
      urls.push(uploaded.secure_url);
    } catch (err) {
      console.error(`[${i + 1}/${count}] ✗ ${err.message}`);
    }
  }

  console.log(`\nDone. ${urls.length}/${count} succeeded.`);
  if (urls.length) console.log("\nPaste into the admin modal:\n" + urls.join("\n"));
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
