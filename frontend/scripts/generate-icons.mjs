// One-off icon generator. Run with `node scripts/generate-icons.mjs` from
// the `frontend/` directory whenever public/logo.png is updated.
//
// Reads public/logo.png (must be a square master, ≥512×512 ideally 1024+).
// Emits:
//   public/favicon.ico                       (multi-size 16/32/48)
//   public/favicon-{16,32,48}.png
//   public/icons/icon-{72,96,128,144,152,192,384,512}.png   (purpose:any)
//   public/icons/maskable-{192,512}.png      (purpose:maskable, padded)
//   public/icons/apple-touch-icon.png        (180×180)
//   public/icons/og-image.png                (1200×630)
//
// Maskable: Android Adaptive Icons crop the icon to a mask (Pixel uses a
// squircle; Samsung uses a teardrop; etc.). Anything outside the safe
// zone (inner 80% of the canvas) may be clipped. So we render the logo
// at 60% size on a solid brand-color background so the mark survives any
// mask shape.

import sharp from "sharp";
import pngToIco from "png-to-ico";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(__dirname, "..");
const publicDir = join(frontendDir, "public");
const iconsDir = join(publicDir, "icons");

const SRC = join(publicDir, "logo.png");
const BRAND_BG = { r: 0x00, g: 0x2b, b: 0x5b, alpha: 1 }; // #002B5B navy
const BRAND_ACCENT = { r: 0xff, g: 0x6a, b: 0x1a, alpha: 1 }; // #FF6A1A orange (unused; reserved)

const PLAIN_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];

const main = async () => {
  if (!existsSync(SRC)) {
    console.error(`Source not found: ${SRC}`);
    process.exit(1);
  }
  await mkdir(iconsDir, { recursive: true });

  const src = await readFile(SRC);
  const meta = await sharp(src).metadata();
  console.log(`Source: ${meta.width}×${meta.height} (${meta.format})`);

  // ── Plain "any" purpose icons: logo fit-contain on transparent ──
  for (const size of PLAIN_SIZES) {
    const out = join(iconsDir, `icon-${size}.png`);
    await sharp(src)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(out);
    console.log(`  → icons/icon-${size}.png`);
  }

  // ── Maskable icons: logo at 60% on solid brand background ──
  for (const size of MASKABLE_SIZES) {
    const inner = Math.round(size * 0.6); // 60% safe zone
    const logoBuf = await sharp(src)
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    const out = join(iconsDir, `maskable-${size}.png`);
    await sharp({
      create: { width: size, height: size, channels: 4, background: BRAND_BG },
    })
      .composite([{ input: logoBuf, gravity: "center" }])
      .png()
      .toFile(out);
    console.log(`  → icons/maskable-${size}.png`);
  }

  // ── Apple touch icon: 180×180 on solid (iOS doesn't like transparent) ──
  {
    const inner = 152;
    const logoBuf = await sharp(src).resize(inner, inner, { fit: "contain" }).toBuffer();
    const out = join(iconsDir, "apple-touch-icon.png");
    await sharp({
      create: { width: 180, height: 180, channels: 4, background: BRAND_BG },
    })
      .composite([{ input: logoBuf, gravity: "center" }])
      .png()
      .toFile(out);
    console.log(`  → icons/apple-touch-icon.png`);
  }

  // ── Favicons: 16/32/48 PNG + .ico ──
  const faviconPngs = [];
  for (const size of [16, 32, 48]) {
    const out = join(publicDir, `favicon-${size}.png`);
    await sharp(src)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(out);
    faviconPngs.push(out);
    console.log(`  → favicon-${size}.png`);
  }
  const ico = await pngToIco(faviconPngs);
  await writeFile(join(publicDir, "favicon.ico"), ico);
  console.log(`  → favicon.ico (multi-size)`);

  // ── Open Graph image: 1200×630 brand background, logo centered ──
  {
    const inner = 360;
    const logoBuf = await sharp(src).resize(inner, inner, { fit: "contain" }).toBuffer();
    const out = join(iconsDir, "og-image.png");
    await sharp({
      create: { width: 1200, height: 630, channels: 4, background: BRAND_BG },
    })
      .composite([{ input: logoBuf, gravity: "center" }])
      .png()
      .toFile(out);
    console.log(`  → icons/og-image.png`);
  }

  console.log("\nDone.");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
