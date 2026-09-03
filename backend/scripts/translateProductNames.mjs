/**
 * Write Arabic names into a product export sheet.
 *
 *   node scripts/translateProductNames.mjs <in.xlsx> <out.xlsx> [--sample N]
 *
 * A product name here is brand + model + type + specs + colour:
 *
 *   Samsung LS24D302GAU Monitor 24" Inch IPS FHD 100Hz 5ms - Black
 *
 * Only two of those carry words. The brand, the model and the spec run stay in
 * Latin — an Arabic shopper reads "IPS FHD 100Hz 5ms" exactly as written, and
 * rendering it in Arabic would make the name slower to scan and wrong half the
 * time.
 *
 * The head noun does not come from the name. It comes from the product's own
 * category, because the shop has already written an Arabic name for all 188 of
 * them and those are the words the shop actually uses:
 *
 *   Gaming Laptops   → لابتوبات جيمنج
 *   Graphics Cards   → كروت شاشة
 *   PoE Switches     → سويتش PoE
 *
 * A first attempt read the head noun out of the name instead, and every one of
 * its failures came from that: "MacBook Air M3 256GB SSD" led with "SSD"
 * because SSD is a word in the type table; an Apple Watch "Aluminium Case"
 * became "كيسة", the word for a PC tower; a RAM "Kit" became "طقم". The
 * category knows what the thing is and the name does not, so the category is
 * what is asked.
 *
 * Nothing is invented. Whatever is not the category, the colour or a known
 * English duplicate of the category is copied through untouched.
 */
/*
  ESM, and `.mjs` rather than `.cjs`.

  This was the one script here written as CommonJS, and CommonJS cannot
  `require` an ES module — which the ExcelJS shim is. Nothing in the file
  needed CJS: it required exactly two modules and used no `module.exports`,
  `__dirname` or conditional require. Renaming it is a smaller change than
  wrapping the whole script in an async IIFE to reach `await import`, and it
  puts it with the other four scripts rather than beside them.
*/
import XLSX from "../utils/xlsxCompat.js";
import fs from "node:fs";

/**
 * Category names are plural — they label a shelf. A single product wants the
 * singular, and Arabic does not derive one mechanically, so the forms that
 * actually occur are listed. Anything unlisted keeps the category's own
 * wording, which reads as a label rather than wrongly.
 */
const SINGULAR = {
  "لابتوبات": "لابتوب", "شاشات": "شاشة", "كاميرات": "كاميرا", "كروت": "كارت",
  "طابعات": "طابعة", "سماعات": "سماعة", "معالجات": "معالج", "كيسات": "كيسة",
  "أقراص": "قرص", "مزودات": "مزود", "تلفزيونات": "تلفزيون", "لوحات": "لوحة",
  "موسعات": "موسع", "ماسحات": "ماسح", "راوترات": "راوتر", "سويتشات": "سويتش",
  "بطاريات": "بطارية", "شواحن": "شاحن", "كابلات": "كابل", "محولات": "محول",
  "أجهزة": "جهاز", "موديولات": "موديول", "مراوح": "مروحة", "مبردات": "مبرد",
  "خراطيش": "خرطوشة", "زجاجات": "زجاجة", "حوامل": "حامل", "شنط": "شنطة",
  "مكبرات": "مكبر", "ميكروفونات": "ميكروفون", "بروجيكتورات": "بروجيكتور",
  "تابلت": "تابلت", "موبايلات": "موبايل", "تليفونات": "تليفون",
  "قارئات": "قارئ", "ساعات": "ساعة", "حافظات": "حافظة", "علب": "علبة",
  "أقلام": "قلم", "كشافات": "كشاف", "حساسات": "حساس", "كواشف": "كاشف",
  "أنظمة": "نظام", "وحدات": "وحدة", "مفاتيح": "مفتاح", "مقويات": "مقوي",
  "سيرفرات": "سيرفر", "خوادم": "خادم", "طقم": "طقم", "أدوات": "أداة",
  "كراسي": "كرسي", "مكاتب": "مكتب", "شرائح": "شريحة", "بطاقات": "بطاقة",
};

const singularise = (categoryAr) => {
  const words = String(categoryAr || "").trim().split(/\s+/);
  if (!words.length) return "";
  if (SINGULAR[words[0]]) words[0] = SINGULAR[words[0]];
  return words.join(" ");
};

/* ── Colours, including the compound marketing ones. ─────────────────── */
const COLOURS = {
  black: "أسود", white: "أبيض", silver: "فضي", grey: "رمادي", gray: "رمادي",
  blue: "أزرق", red: "أحمر", green: "أخضر", yellow: "أصفر", pink: "وردي",
  purple: "بنفسجي", gold: "ذهبي", golden: "ذهبي", bronze: "برونزي",
  graphite: "جرافيت", carbon: "كربوني", midnight: "أسود ليلي", cyan: "سماوي",
  magenta: "ماجنتا", titanium: "تيتانيوم", platinum: "بلاتيني", beige: "بيج",
  brown: "بني", orange: "برتقالي", transparent: "شفاف", clear: "شفاف",
  starlight: "ستارلايت", ivory: "عاجي", champagne: "شمبانيا",
};
/** Words that only ever qualify a colour. */
const COLOUR_ADJ = {
  luna: "لونا", mica: "ميكا", storm: "عاصف", eclipse: "كسوف", quiet: "هادئ",
  arctic: "قطبي", cosmos: "كوزمو", performance: "بيرفورمانس", natural: "طبيعي",
  shadow: "ظل", onyx: "أونكس", mecha: "ميكا", cool: "بارد", pure: "نقي",
  deep: "غامق", light: "فاتح", dark: "غامق", matte: "مطفي", glossy: "لامع",
  space: "فضائي", rose: "وردي", sky: "سماوي", navy: "كحلي", ice: "ثلجي",
  jet: "نفاث", abyss: "عميق", moon: "قمري", sand: "رملي", steel: "فولاذي",
};

const norm = (w) => w.toLowerCase().replace(/[^a-z]/g, "");

/**
 * Words the category already says, so the name need not repeat them.
 *
 * Only whole words, and only when the category itself contains them: a
 * "Gaming Laptops" product drops a "Gaming Laptop" from its name, while a
 * "Gaming" that appears in a category without it stays put.
 */
const redundantFrom = (categoryEn) => {
  const stop = new Set(["and", "the", "for", "with", "in", "of", "&"]);
  return new Set(
    String(categoryEn || "")
      .split(/[^A-Za-z]+/)
      .map((w) => norm(w))
      .filter((w) => w.length > 2 && !stop.has(w))
      .flatMap((w) => (w.endsWith("s") ? [w, w.slice(0, -1)] : [w, `${w}s`]))
  );
};

const translateName = (name, categoryEn, categoryAr) => {
  // Invisible bidi marks travel in names pasted out of a mixed-direction
  // document — "55" Inch ... ‎- Black" carries a left-to-right mark right
  // before the dash, which stopped the colour matching and left "- Black"
  // sitting in English at the end of an Arabic name.
  const original = String(name || "").replace(/[‎‏‪-‮⁦-⁩]/g, "").trim();
  if (!original) return "";

  // The trailing colour comes off first — it has its own grammar, and left in
  // the run "Luna Grey" is two loose words nobody translates correctly.
  let head = original;
  let colourAr = "";
  const dash = original.match(/^(.*?)\s[-–]\s([^-–]+)$/);
  if (dash) {
    const parts = dash[2].trim().split(/\s+/).map(norm).filter(Boolean);
    if (parts.length && parts.length <= 3 && parts.every((p) => COLOURS[p] || COLOUR_ADJ[p])) {
      head = dash[1].trim();
      const nouns = parts.filter((p) => COLOURS[p]).map((p) => COLOURS[p]);
      const adjs = parts.filter((p) => !COLOURS[p]).map((p) => COLOUR_ADJ[p]);
      colourAr = [...nouns, ...adjs].join(" ");
    }
  }

  /*
    Drop the words the Arabic head noun is about to say anyway — but only where
    two or more of them sit together.

    A single repeated word is usually part of a product line rather than a
    description of it. Dropping one at a time turned "Apple MacBook Air M3"
    into "Apple Air M3", because the category is MacBooks; the pair in
    "... Gaming Laptop Intel Core i5" is a description and goes. Leaving the odd
    single word in is a name that says its type twice, which is untidy. Removing
    one that belonged to the model is a name for a different product.
  */
  const redundant = redundantFrom(categoryEn);
  const toks = head.split(/\s+/);
  const isRedundant = toks.map((tok) => {
    const k = norm(tok);
    // A token carrying a digit is a model or a spec: never dropped.
    return !!k && !/\d/.test(tok) && redundant.has(k);
  });
  const drop = new Array(toks.length).fill(false);
  for (let i = 0; i < toks.length; ) {
    if (!isRedundant[i]) { i += 1; continue; }
    let j = i;
    while (j < toks.length && isRedundant[j]) j += 1;
    if (j - i >= 2) for (let k = i; k < j; k += 1) drop[k] = true;
    i = j;
  }
  const kept = toks
    .filter((_, i) => !drop[i])
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,)])/g, "$1")
    .trim();

  const built = [singularise(categoryAr), kept].filter(Boolean).join(" ").trim();
  return colourAr ? `${built} - ${colourAr}` : built;
};

/* ── Run ─────────────────────────────────────────────────────────────── */
const [, , inPath, outPath, ...flags] = process.argv;
if (!inPath) {
  console.error("usage: node scripts/translateProductNames.mjs <in.xlsx> <out.xlsx> [--sample N]");
  process.exit(1);
}
const sampleAt = flags.indexOf("--sample");
const sampleN = sampleAt >= 0 ? Number(flags[sampleAt + 1] || 25) : 0;

const CATEGORIES = "C:/Users/Crafted/Downloads/belgomla/categories-recategorized.xlsx";
const catAr = new Map();
if (fs.existsSync(CATEGORIES)) {
  const catBook = await XLSX.readFile(CATEGORIES);
  for (const r of XLSX.utils.sheet_to_json(catBook.Sheets.Categories, { defval: "" })) {
    const en = String(r["Category Name"] || "").trim().toLowerCase();
    const ar = String(r["Arabic Name"] || "").trim();
    if (en && ar) catAr.set(en, ar);
  }
}
if (!catAr.size) {
  console.error("No Arabic category names found — the head nouns come from there, so this would produce nothing useful.");
  process.exit(1);
}

const wb = await XLSX.readFile(inPath);
const header = XLSX.utils.sheet_to_json(wb.Sheets.Products, { header: 1 })[0];
const rows = XLSX.utils.sheet_to_json(wb.Sheets.Products, { defval: "" });

let filled = 0;
let kept = 0;
let noCategory = 0;

for (const r of rows) {
  if (String(r["Arabic Name"] || "").trim()) { kept += 1; continue; }
  const catEn = String(r["Category Name"] || "").trim();
  const ar = catAr.get(catEn.toLowerCase());
  if (!ar) { noCategory += 1; continue; }
  const built = translateName(r["Product Name"], catEn, ar);
  if (built) { r["Arabic Name"] = built; filled += 1; }
}

if (sampleN) {
  const step = Math.max(1, Math.floor(rows.length / sampleN));
  console.log("sample\n" + "=".repeat(76));
  for (let i = 0; i < rows.length && i / step < sampleN; i += step) {
    console.log(`EN  ${String(rows[i]["Product Name"]).slice(0, 80)}`);
    console.log(`AR  ${String(rows[i]["Arabic Name"]).slice(0, 80)}\n`);
  }
}

console.log(`rows                        : ${rows.length}`);
console.log(`Arabic names written        : ${filled}`);
console.log(`already had one, left alone : ${kept}`);
console.log(`skipped, category unmatched : ${noCategory}`);

if (outPath) {
  wb.Sheets.Products = XLSX.utils.json_to_sheet(rows, { header });
  await XLSX.writeFile(wb, outPath);
  console.log(`\nwritten: ${outPath}`);
}
