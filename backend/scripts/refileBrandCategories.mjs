/**
 * Re-file the products sitting under brand-named categories.
 *
 *   node scripts/refileBrandCategories.mjs          # report only (default)
 *   node scripts/refileBrandCategories.mjs --apply  # write
 *
 * An import filed manufacturers as departments, so 858 products have a brand
 * where their category should be. The brand is nearly always already on the
 * product; what is missing is a real category. This reads the product name —
 * which in this catalogue is uniformly "<Brand> <Model> <Type> ..." — and moves
 * each product to the department the type belongs in.
 *
 * Rules are ordered and the first match wins, so the specific ones come first:
 * "Gaming Mouse" has to be tested before "Gaming", and "Battery Pack ... UPS"
 * before "Pack". Anything no rule claims is left exactly where it is and listed
 * at the end — a product moved to a guessed category is worse than one that
 * stayed put, because nobody goes looking for a mistake they were not told
 * about.
 *
 * The brand field is only filled where it is empty. Where a product already
 * names a brand that differs from its category, the product is right and the
 * category was wrong: the "Nvidia" category holds Gigabyte and Asus cards.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Brand from "../models/brand.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

const apply = process.argv.includes("--apply");

const normalize = (s) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * name → destination slug. First match wins, so order is the specification.
 */
const RULES = [
  // ── Power ──────────────────────────────────────────────────────────────
  // Battery packs and management cards are UPS accessories; they say "UPS"
  // themselves, so one rule covers the family.
  ["uninterruptible-power-supply-ups", /\b(ups|uninterruptible)\b/i],
  ["uninterruptible-power-supply-ups", /\bbattery pack\b/i],
  ["uninterruptible-power-supply-ups", /\b(line interactive|on-?line)\b/i],

  // ── Displays ───────────────────────────────────────────────────────────
  ["monitors", /\bmonitor\b/i],
  ["monitors", /\bpen display\b/i],

  // ── Laptops ────────────────────────────────────────────────────────────
  // Tested before the generic "gaming" peripherals rules below.
  ["gaming-laptops", /\b(rtx|gtx)\b.*\b(inch|laptop|notebook)\b/i],
  ["gaming-laptops", /\b(nitro|predator|rog|tuf gaming laptop|legion|victus|omen|katana|raider)\b/i],
  ["business-laptops", /\b(thinkpad|latitude|elitebook|probook|vostro|travelmate|expertbook)\b/i],
  ["personal-laptops", /\b(ideapad|inspiron|pavilion|vivobook|aspire|macbook|swift|yoga|surface laptop)\b/i],
  ["personal-laptops", /\b(intel core|amd ryzen)\b.*\b(inch)\b/i],

  // ── Components ─────────────────────────────────────────────────────────
  ["graphics-cards", /\b(graphic|graphics) card\b/i],
  ["graphics-cards", /\b(geforce|radeon|quadro)\b/i],
  ["processors", /\b(processor|cpu)\b/i],
  ["motherboards", /\b(motherboard|mainboard)\b/i],
  ["ram-memory", /\b(ram|ddr[45]|memory module)\b/i],
  ["power-supplies", /\b(power supply|psu)\b/i],
  ["pc-cases-cooling", /\b(pc case|cpu cooler|liquid cooler|case fan)\b/i],

  // ── Storage ────────────────────────────────────────────────────────────
  ["external-storage", /\bexternal\b.*\b(ssd|hdd|drive)\b/i],
  ["internal-storage", /\b(internal|nvme|m\.2|sata)\b.*\b(ssd|hdd)\b/i],
  ["internal-storage", /\b(ssd|hard disk|hdd)\b/i],
  ["memory-cards-flash", /\b(flash drive|memory card|micro ?sd|usb stick)\b/i],

  // ── Peripherals ────────────────────────────────────────────────────────
  ["keyboards-mice", /\b(keyboard|mouse|mice|keypad|trackball)\b/i],
  ["headsets-speakers", /\b(headset|headphone|earphone|earbud|speakerphone|speaker|soundbar)\b/i],

  // ── Printing ───────────────────────────────────────────────────────────
  ["laser-printers", /\blaser\b.*\bprinter\b/i],
  ["inkjet-printers", /\b(inkjet|deskjet|ink tank)\b/i],
  ["scanners", /\bscanner\b/i],
  ["projectors", /\bprojector\b/i],
  ["laser-printers", /\bprinter\b/i],

  // ── Network ────────────────────────────────────────────────────────────
  ["wifi-router-access-point", /\b(access point|wifi router|wireless router)\b/i],
  ["modem-router", /\b(modem|router)\b/i],
  ["poe-switches", /\bpoe\b.*\bswitch\b/i],
  ["managed-switches", /\bmanaged\b.*\bswitch\b/i],
  ["switches", /\bswitch\b/i],
  ["network-cables", /\b(patch cord|utp|cat ?[56])\b/i],
  ["patch-panels", /\bpatch panel\b/i],
  ["rack", /\b(rack|cabinet)\b/i],
  ["network-storage", /\b(nas|network storage)\b/i],
  ["pci-cards-usb-adapters", /\b(usb adapter|pci|network adapter)\b/i],

  // ── Surveillance ───────────────────────────────────────────────────────
  ["ip-camera", /\bip camera\b/i],
  ["ptz-camera", /\bptz\b/i],
  ["access-control", /\b(fingerprint|access control|turnstile)\b/i],
  ["intercom", /\bintercom\b/i],

  // ── Cashier ────────────────────────────────────────────────────────────
  ["barcode-scanners", /\bbarcode\b/i],
  ["pos-terminals", /\b(pos terminal|point of sale)\b/i],
  ["receipt-printers", /\breceipt printer\b/i],
  ["cash-drawers", /\bcash drawer\b/i],

  // ── Office ─────────────────────────────────────────────────────────────
  ["shredders", /\bshredder\b/i],
  ["photocopiers", /\b(photocopier|copier)\b/i],

  // ── Catch-alls, last on purpose ────────────────────────────────────────
  ["computer-accessories", /\b(webcam|web cam|docking station|usb-?c hub|adapter|cable|graphic tablet|pen tablet|stylus|presenter)\b/i],
];

await mongoose.connect(process.env.MONGO_URI);
console.log(apply ? "APPLYING changes\n" : "DRY RUN — nothing will be written\n");

const [brands, cats] = await Promise.all([
  Brand.find({ deleted: { $ne: true } }).select("name").lean(),
  Category.find({ deleted: { $ne: true } }).select("name slug").lean(),
]);

const bySlug = new Map(cats.map((c) => [c.slug, c]));
const brandByNorm = new Map(brands.map((b) => [normalize(b.name), b]));

// Fail before touching anything if a rule points at a category that is gone.
const badTargets = [...new Set(RULES.map(([slug]) => slug))].filter(
  (slug) => !bySlug.has(slug)
);
if (badTargets.length) {
  console.error(`Rules point at missing categories: ${badTargets.join(", ")}`);
  await mongoose.disconnect();
  process.exit(1);
}

const brandCategories = cats.filter((c) => brandByNorm.has(normalize(c.name)));
const moves = new Map(); // target slug → [{ from, name, id }]
const unmatched = new Map(); // source category name → [names]
let brandFills = 0;

for (const cat of brandCategories) {
  const products = await Product.find({ category: cat._id, deleted: { $ne: true } })
    .select("name brand")
    .lean();
  if (!products.length) continue;

  for (const p of products) {
    const rule = RULES.find(([, test]) => test.test(p.name || ""));
    if (!rule) {
      unmatched.set(cat.name, [...(unmatched.get(cat.name) || []), p.name]);
      continue;
    }
    const [slug] = rule;
    moves.set(slug, [
      ...(moves.get(slug) || []),
      { from: cat.name, name: p.name, id: p._id, hasBrand: Boolean(p.brand) },
    ]);
    if (!p.brand) brandFills += 1;
  }
}

const totalMoves = [...moves.values()].reduce((n, list) => n + list.length, 0);
const totalUnmatched = [...unmatched.values()].reduce((n, list) => n + list.length, 0);

console.log("=== WHERE PRODUCTS WOULD GO ===\n");
for (const [slug, list] of [...moves.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const target = bySlug.get(slug);
  console.log(`${target.name}  (${list.length})`);
  const sources = [...new Set(list.map((m) => m.from))];
  console.log(`   from: ${sources.slice(0, 8).join(", ")}${sources.length > 8 ? ", …" : ""}`);
  for (const m of list.slice(0, 2)) console.log(`   e.g. ${m.name.slice(0, 88)}`);
  console.log("");
}

console.log(`=== LEFT ALONE — no rule matched (${totalUnmatched}) ===\n`);
for (const [source, names] of [...unmatched.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${source}  (${names.length})`);
  for (const n of names.slice(0, 3)) console.log(`   ${n.slice(0, 88)}`);
  console.log("");
}

console.log(`would move:        ${totalMoves}`);
console.log(`would stay put:    ${totalUnmatched}`);
console.log(`brands to fill in: ${brandFills}`);

if (apply) {
  for (const [slug, list] of moves) {
    const target = bySlug.get(slug);
    await Product.updateMany(
      { _id: { $in: list.map((m) => m.id) } },
      { $set: { category: target._id } }
    );
    // Only where the product has none: an existing brand is the product's own
    // and beats the name of the category it happened to sit in.
    const needBrand = list.filter((m) => !m.hasBrand);
    for (const m of needBrand) {
      const first = normalize(String(m.name).split(/\s+/)[0]);
      const brand = brandByNorm.get(first) || brandByNorm.get(normalize(m.from));
      if (brand) await Product.updateOne({ _id: m.id }, { $set: { brand: brand._id } });
    }
  }
  console.log("\nApplied.");
} else {
  console.log("\nRun again with --apply to write.");
}

await mongoose.disconnect();
