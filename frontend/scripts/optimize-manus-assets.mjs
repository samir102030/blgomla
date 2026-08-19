/**
 * Turns the Manus visual-assets package into web-sized files under
 * `public/manus/`.
 *
 * The delivered PNGs are 2.5–4 MB each at up to 2560px — fine as design
 * masters, ruinous as page weight. This script is the one place that decides
 * how they get to the browser: WebP at the size each surface actually paints,
 * plus a small PNG for the brand mark where transparency matters.
 *
 * Re-run it when the design package is updated:
 *   node scripts/optimize-manus-assets.mjs <path-to-assets/images>
 */
import sharp from "sharp";
import { mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const source = process.argv[2];
if (!source) {
  console.error("usage: node scripts/optimize-manus-assets.mjs <path-to-images-dir>");
  process.exit(1);
}

const outDir = resolve("public/manus");

/* Width is what the surface paints at 2× on a normal desktop. The hero spans
   the page; the cards are a third of it. Quality sits just under the point
   where the gradients in these renders start to band. */
const TARGETS = [
  { in: "belgomla-smart-hero-cctv-network.png", out: "hero-cctv-network.webp", width: 1920, quality: 78 },
  /* The hero carousel banners, delivered as WebP masters at 1920×1080 rather
     than as PNGs. Re-encoded here anyway so every file under `public/manus`
     went through the same quality decision instead of arriving at whatever
     the exporter happened to use. Run against the banner package:
       node scripts/optimize-manus-assets.mjs <path-to-banner-assets/images> */
  { in: "01_main-surveillance-network.webp", out: "banner-surveillance.webp", width: 1920, quality: 78 },
  { in: "05_fire-safety.webp", out: "banner-fire.webp", width: 1920, quality: 78 },
  { in: "06_audio-sound.webp", out: "banner-audio.webp", width: 1920, quality: 78 },
  { in: "07_network-hero.webp", out: "banner-network.webp", width: 1920, quality: 78 },
  { in: "08_attendance-fingerprint.webp", out: "banner-attendance.webp", width: 1920, quality: 78 },
  { in: "09_intercom-pbx.webp", out: "banner-intercom.webp", width: 1920, quality: 78 },
  { in: "belgomla-surveillance-solution.png", out: "solution-surveillance.webp", width: 900, quality: 76 },
  { in: "belgomla-network-infrastructure.png", out: "solution-network.webp", width: 900, quality: 76 },
  { in: "belgomla-smart-access-control.png", out: "solution-smart.webp", width: 900, quality: 76 },
  // The mark sits at 48px in the header. It arrives on a flat chroma-green
  // field rather than an alpha channel, so it is keyed out first — see
  // `keyOutBackground`. It keeps a PNG twin for anywhere WebP is awkward.
  { in: "belgomla-brand-symbol.png", out: "brand-symbol.webp", width: 192, quality: 90, key: true },
  { in: "belgomla-brand-symbol.png", out: "brand-symbol.png", width: 192, png: true, key: true },
];

/**
 * Replaces the flat background field with transparency.
 *
 * The delivered brand symbol is an orange mark sitting on solid green. Dropped
 * onto the charcoal header as-is it reads as a green tile, so the field has to
 * become alpha. The key colour is sampled from the corner rather than
 * hard-coded, and pixels are faded across a band so the mark keeps a clean
 * edge instead of an aliased one.
 */
async function keyOutBackground(input, width) {
  const { data, info } = await sharp(input)
    .resize({ width, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const [kr, kg, kb] = [data[0], data[1], data[2]];
  const HARD = 60; // inside this distance the pixel is background
  const SOFT = 110; // between the two it fades, which keeps edges smooth

  for (let i = 0; i < data.length; i += info.channels) {
    const distance = Math.hypot(data[i] - kr, data[i + 1] - kg, data[i + 2] - kb);
    if (distance <= HARD) {
      data[i + 3] = 0;
    } else if (distance < SOFT) {
      data[i + 3] = Math.round(((distance - HARD) / (SOFT - HARD)) * 255);
    }
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });
}

await mkdir(outDir, { recursive: true });

const available = new Set(await readdir(source));
let total = 0;

for (const target of TARGETS) {
  if (!available.has(target.in)) {
    console.warn(`skip  ${target.in} — not in ${source}`);
    continue;
  }

  const pipeline = target.key
    ? await keyOutBackground(join(source, target.in), target.width)
    : sharp(join(source, target.in)).resize({
        width: target.width,
        withoutEnlargement: true,
      });

  const info = await (target.png
    ? pipeline.png({ compressionLevel: 9 })
    : pipeline.webp({ quality: target.quality })
  ).toFile(join(outDir, target.out));

  total += info.size;
  console.log(
    `${target.out.padEnd(28)} ${String(info.width).padStart(5)}px  ${(info.size / 1024).toFixed(0)} KB`
  );
}

console.log(`\ntotal: ${(total / 1024).toFixed(0)} KB in ${outDir}`);
