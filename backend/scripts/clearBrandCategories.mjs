/**
 * Take brand names out of the category tree.
 *
 *   node scripts/clearBrandCategories.mjs          # report only
 *   node scripts/clearBrandCategories.mjs --apply  # write
 *
 * A brand is not a place a product lives, but the import made forty-two of them
 * departments, so the category filter offers "Logitech" and "Panasonic" beside
 * "Monitors". The brand filter is where those belong and it already has them.
 *
 * Three steps, in order, because the last one is only safe after the first two:
 *
 *   1. Create the departments the leftovers actually need. Panasonic's stock is
 *      PBX cards and there is nowhere in this catalogue to file a PBX card;
 *      that is a missing department, not a stray product.
 *   2. Move what is left out of the brand categories, by product type.
 *   3. Retire the brand categories — and only the ones that ended up empty. A
 *      category still holding products is left alone and reported, because
 *      hiding it would take its products out of the catalogue with it.
 *
 * Retiring is `deleted: true`, the soft flag the rest of the app already
 * honours, so nothing is destroyed and a mistake is one field to undo.
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

/** Departments this catalogue is missing, with where they hang. */
const NEW_CATEGORIES = [
  { slug: "telephony-pbx", name: "Telephony & PBX", nameAr: "السنترالات والتليفونات", parent: "office-solution" },
  { slug: "video-conference", name: "Video Conference", nameAr: "أنظمة المؤتمرات", parent: "office-solution" },
  { slug: "interactive-whiteboard", name: "Interactive Whiteboard", nameAr: "السبورات التفاعلية", parent: "office-solution" },
  { slug: "graphic-tablets", name: "Graphic Tablets", nameAr: "أجهزة الرسم الجرافيك", parent: "computer" },
  { slug: "tablets", name: "Tablets", nameAr: "التابلت", parent: "computer" },
  // Apple Watches were the only stock with nowhere at all to go — a watch is
  // not a computer accessory, and filing it as one is the kind of shortcut that
  // makes a catalogue untrustworthy.
  { slug: "wearables", name: "Wearables", nameAr: "الأجهزة القابلة للارتداء", parent: "accessories" },
];

/**
 * name → destination slug, first match wins. Covers what the earlier pass left.
 *
 * No trailing `\b` after a model prefix. "KX-NS5170" has no word boundary
 * between the N and the S — they are both word characters — so `kx-n\b` matched
 * none of Panasonic's seventy-four PBX cards while looking like it should.
 */
const RULES = [
  ["wearables", /\b(watch|smartwatch|fitness band|smart band)\b/i],
  ["ink-toner", /\b(toner|cartridge|ink)\b/i],
  ["pc-cases-cooling", /\b(cooler|cooling pad|laptop cooler)\b/i],
  // Meeting-room hardware: bars, touch panels, expansion modules, extenders.
  // All of it is one system, and none of it means anything on its own shelf.
  ["video-conference", /\b(meeting ?bar|video (bar|collaboration)|collabor?ation (unit|bar|touch panel)|touch panel|expansion module|byod|extender)\b/i],
  // Panasonic's telephony runs KX-NS, KX-DT, KX-HT, KX-HDV… — the model prefix
  // is the reliable signal, so match the shape rather than list every series.
  ["telephony-pbx", /(\bkx-?[a-z]{1,3}\d|\bpbx\b|\bip ?phone\b|\bsip ?phone\b|\bdect\b|\bphone\b|\bhandset\b|\bcentral\b)/i],
  // Video-conference rigs come with their own furniture: mic pods, table and
  // riser mounts, mounting kits. They belong with the system, not in cables.
  ["video-conference", /\b(video ?conference|conference ?cam|speakerphone|ceiling microphone|microphone array|mic pod|rally|tap (riser|table|mount)|mounting kit)\b/i],
  ["interactive-whiteboard", /\b(interactive (display|whiteboard|flat)|viewboard)\b/i],
  ["graphic-tablets", /\b(pen display|graphic tablet|pen tablet|signature pad|pen nibs|intuos|cintiq|wacom)\b/i],
  ["tablets", /\b(ipad|galaxy tab|tablet)\b/i],
  ["uninterruptible-power-supply-ups", /\b(avr|surge ?arrest|surge protector|line-r)\b/i],
  // "Gaming Heads" is a headset with the word cut short in the source data.
  ["headsets-speakers", /\b(loudspeaker|speakers?|soundbar|home theater|headsets?|gaming heads|headphone|earphone|earbud)\b/i],
  ["keyboards-mice", /\b(keyboard|mouse ?pad|mouse|mice|type cover)\b/i],
  // Wheels, pedals and flight yokes are gaming controllers; this catalogue has
  // no gaming department, and they are peripherals before they are anything.
  ["computer-accessories", /\b(presenter|presentation|spotlight|stylus|slim pen|webcam|web cam|dock|racing wheel|shifter|flight (yoke|stick)|gamepad|joystick|controller|charging system|microphone)\b/i],
];

await mongoose.connect(process.env.MONGO_URI);
console.log(apply ? "APPLYING\n" : "DRY RUN — nothing will be written\n");

// ── 1. the missing departments ────────────────────────────────────────────
const existing = await Category.find({ deleted: { $ne: true } })
  .select("name slug")
  .lean();
const bySlug = new Map(existing.map((c) => [c.slug, c]));

console.log("=== departments to create ===");
for (const spec of NEW_CATEGORIES) {
  if (bySlug.has(spec.slug)) {
    console.log(`  ${spec.name.padEnd(26)} already exists`);
    continue;
  }
  const parent = bySlug.get(spec.parent);
  if (!parent) {
    console.log(`  ${spec.name.padEnd(26)} SKIPPED — parent ${spec.parent} not found`);
    continue;
  }
  console.log(`  ${spec.name.padEnd(26)} under ${parent.name}`);
  if (apply) {
    // Built through the model, not insertMany, so the slug/level/path hooks run.
    const created = new Category({
      name: spec.name,
      nameAr: spec.nameAr,
      parentCategory: parent._id,
      showInMenu: true,
    });
    await created.save();
    bySlug.set(spec.slug, created.toObject());
  }
}

// ── 2. move what is still in a brand category ─────────────────────────────
const brands = await Brand.find({ deleted: { $ne: true } }).select("name").lean();
const brandNorms = new Set(brands.map((b) => normalize(b.name)));
const cats = await Category.find({ deleted: { $ne: true } }).select("name slug").lean();
const brandCategories = cats.filter((c) => brandNorms.has(normalize(c.name)));

const moves = new Map();
const stuck = [];
for (const cat of brandCategories) {
  const products = await Product.find({ category: cat._id, deleted: { $ne: true } })
    .select("name")
    .lean();
  for (const p of products) {
    const rule = RULES.find(([, test]) => test.test(p.name || ""));
    if (!rule) {
      stuck.push({ cat: cat.name, name: p.name });
      continue;
    }
    moves.set(rule[0], [...(moves.get(rule[0]) || []), p._id]);
  }
}

console.log("\n=== leftovers to move ===");
for (const [slug, ids] of moves) {
  const target = bySlug.get(slug);
  console.log(`  ${(target?.name || slug).padEnd(26)} ${ids.length}`);
  if (apply && target) {
    await Product.updateMany({ _id: { $in: ids } }, { $set: { category: target._id } });
  }
}
if (!moves.size) console.log("  (none)");

// ── 3. retire the brand categories that are now empty ─────────────────────
const emptied = [];
const kept = [];
for (const cat of brandCategories) {
  const left = apply
    ? await Product.countDocuments({ category: cat._id, deleted: { $ne: true } })
    : (await Product.countDocuments({ category: cat._id, deleted: { $ne: true } })) -
      [...moves.values()].flat().length * 0; // dry run counts the pre-move state
  (left === 0 ? emptied : kept).push({ cat, left });
}

console.log(`\n=== brand categories to retire (${emptied.length}) ===`);
console.log(`  ${emptied.map((e) => e.cat.name).join(", ") || "(none)"}`);

if (kept.length) {
  console.log(`\n=== still holding products, left alone (${kept.length}) ===`);
  for (const k of kept) console.log(`  ${k.cat.name.padEnd(26)} ${k.left} products`);
}

if (stuck.length) {
  console.log(`\n=== no rule matched (${stuck.length}) ===`);
  for (const s of stuck.slice(0, 12)) console.log(`  ${s.cat}: ${s.name.slice(0, 74)}`);
  if (stuck.length > 12) console.log(`  … and ${stuck.length - 12} more`);
}

if (apply && emptied.length) {
  await Category.updateMany(
    { _id: { $in: emptied.map((e) => e.cat._id) } },
    { $set: { deleted: true, showInMenu: false } }
  );
  console.log("\nApplied.");
} else if (!apply) {
  console.log("\nRun again with --apply to write.");
}

await mongoose.disconnect();
