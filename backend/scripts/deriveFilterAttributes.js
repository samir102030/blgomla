/**
 * Derive clean, filterable specs from the datasheet text already on products.
 *
 *   node scripts/deriveFilterAttributes.js --dry   # report, change nothing
 *   node scripts/deriveFilterAttributes.js         # apply
 *
 * Why this exists: the bulk sheets carry manufacturer spec dumps — "Min.
 * Illumination: Color 0.005 Lux @ (F1.6, AGC ON), B/W 0 Lux with IR" — which
 * are fine to read on a product page and useless as filters, because almost
 * every value is unique. A storefront filter needs a short shared vocabulary:
 * 2 MP, 4 MP, 6 MP. That is what this writes, from three sources in order of
 * confidence, so a product only falls through to a guess when the plain text
 * didn't say.
 *
 * Existing attributes are left alone — these are added alongside them.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import Product from "../models/product.model.js";

const dryRun = process.argv.includes("--dry");

const MEGAPIXEL = "Mega Pixel";
const LENS = "Lens";

// Megapixel buckets a shopper recognises. Sensor maths never lands exactly on
// them (2688 × 1520 is 4.09 MP, sold as 4 MP), so a computed value snaps to
// the nearest one it is genuinely close to.
const MP_BUCKETS = [2, 3, 4, 5, 6, 8, 12];

const snapMegapixels = (value) => {
  const nearest = MP_BUCKETS.reduce((best, b) =>
    Math.abs(b - value) < Math.abs(best - value) ? b : best
  );
  // More than 15% out is a sensor we don't have a bucket for — say nothing
  // rather than file it under the wrong one.
  return Math.abs(nearest - value) / nearest <= 0.15 ? nearest : null;
};

const attrValue = (product, ...names) => {
  for (const attr of product.attributes || []) {
    const name = String(attr?.name ?? "").trim().toLowerCase();
    if (names.some((n) => n.toLowerCase() === name)) return String(attr?.value ?? "");
  }
  return "";
};

/** 1. The name says it outright: "... 4 MP 2.8mm ColorVu ...". */
const mpFromName = (name) => {
  const m = /(\d+(?:\.\d+)?)\s*MP\b/i.exec(name || "");
  if (!m) return null;
  return snapMegapixels(parseFloat(m[1]));
};

/** 2. "4K" is 8 MP in this catalogue's vocabulary. */
const mpFrom4K = (name) => (/\b4K\b/i.test(name || "") ? 8 : null);

/** 3. Multiply out a stated sensor resolution: "3840 × 2160" → 8 MP. */
const mpFromResolution = (product) => {
  const raw = attrValue(product, "Max. Resolution", "Resolution", "Recording Resolution");
  const m = /(\d{3,5})\s*[×x*]\s*(\d{3,5})/.exec(raw);
  if (!m) return null;
  return snapMegapixels((parseInt(m[1], 10) * parseInt(m[2], 10)) / 1_000_000);
};

/** Fixed focal length, when the name states one: "2.8mm", "4 mm". */
const lensFromName = (name) => {
  const m = /(\d+(?:\.\d+)?)\s*mm\b/i.exec(name || "");
  if (!m) return null;
  const mm = parseFloat(m[1]);
  // Millimetre figures in these names are either a lens or a case dimension;
  // no surveillance lens is 100 mm, no case is under 1 mm.
  return mm >= 1 && mm <= 50 ? `${mm} mm` : null;
};

const setAttr = (product, name, value) => {
  const rest = (product.attributes || []).filter(
    (a) => String(a?.name ?? "").trim().toLowerCase() !== name.toLowerCase()
  );
  product.attributes = [...rest, { name, value }];
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/belgomla");
  console.log(`✅ Connected${dryRun ? " (dry run — nothing will be written)" : ""}\n`);

  const products = await Product.find({ deleted: false }).select("name attributes");

  const tally = { mp: new Map(), lens: new Map() };
  const source = { name: 0, fourK: 0, resolution: 0, none: 0 };
  let changed = 0;

  for (const product of products) {
    let touched = false;

    let mp = mpFromName(product.name);
    if (mp) source.name += 1;
    if (!mp) {
      mp = mpFromResolution(product);
      if (mp) source.resolution += 1;
    }
    if (!mp) {
      mp = mpFrom4K(product.name);
      if (mp) source.fourK += 1;
    }
    if (mp) {
      const label = `${mp} MP`;
      setAttr(product, MEGAPIXEL, label);
      tally.mp.set(label, (tally.mp.get(label) ?? 0) + 1);
      touched = true;
    } else {
      source.none += 1;
    }

    const lens = lensFromName(product.name);
    if (lens) {
      setAttr(product, LENS, lens);
      tally.lens.set(lens, (tally.lens.get(lens) ?? 0) + 1);
      touched = true;
    }

    if (touched) {
      changed += 1;
      if (!dryRun) await product.save();
    }
  }

  const report = (label, map) => {
    console.log(`${label}:`);
    const rows = [...map.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
    for (const [value, count] of rows) console.log(`   ${value.padEnd(10)} ${count} products`);
  };

  report(MEGAPIXEL, tally.mp);
  console.log(
    `   sources — name: ${source.name}, resolution: ${source.resolution}, 4K: ${source.fourK}, none: ${source.none}\n`
  );
  report(LENS, tally.lens);

  console.log(
    `\n${dryRun ? "Would update" : "Updated"} ${changed} of ${products.length} products.`
  );
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
