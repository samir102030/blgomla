/**
 * Two questions, asked of the live storefront and nothing else. Reads only.
 *
 *   node scripts/auditCatalogue.mjs [https://your-api/api]
 *
 * 1. Is anything in the catalogue the same product twice? A re-import that
 *    matched on a field the sheet did not carry leaves a second copy of every
 *    row. Twenty rows on a dashboard page will never show that; a count will.
 *
 * 2. Is the electronics section still sealed? It is held apart by two marks
 *    that have to agree — `audience: "electronics"` on the product and a
 *    category inside the branch whose root carries `sectionKey`. Either mark
 *    alone is a hole: marked but filed outside is invisible from both
 *    listings, and filed inside but unmarked shows up across the whole
 *    storefront, because the hiding keys off the mark and not off the category.
 *
 * Deliberately over HTTP rather than against the database. What matters is not
 * what the collection holds but what the shop serves, and the two differ by
 * every filter between them — which is the part that breaks.
 */
const B = (process.argv[2] || "https://blgomla-api.vercel.app/api").replace(/\/$/, "");
const LIMIT = 500;

const get = async (path) => {
  const r = await fetch(B + path);
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
  return r.json();
};

const pull = async (label, extra = "") => {
  const out = [];
  for (let page = 1; ; page += 1) {
    const j = await get(`/products/storefront?limit=${LIMIT}&page=${page}&sortBy=newest${extra}`);
    out.push(...(j.data || []));
    process.stdout.write(`\r  ${label}: ${out.length}/${j.total}   `);
    if (!(j.data || []).length || out.length >= j.total || page >= (j.pages || 1)) break;
  }
  console.log("");
  return out;
};

const ok = (pass, label, detail) =>
  console.log(`  ${pass ? "OK  " : "FAIL"}  ${label.padEnd(52)} ${detail}`);

/* ── the branch ─────────────────────────────────────────────────────── */
const tree = (await get("/categories/tree")).tree;
const flat = [];
const walk = (n, root) => {
  flat.push({ ...n, root });
  for (const c of n.children || []) walk(c, root);
};
for (const r of tree) walk(r, r.sectionKey === "electronics" ? "electronics" : "public");
const elecRoot = tree.find((r) => r.sectionKey === "electronics");
if (!elecRoot) {
  console.error("No category carries sectionKey 'electronics' — nothing to check.");
  process.exit(1);
}
const branch = new Set(flat.filter((c) => c.root === "electronics").map((c) => String(c._id)));
console.log(`\ncategories: ${flat.length}  (${branch.size} in the electronics branch, ${flat.length - branch.size} outside)`);

const pub = await pull("general catalogue");
const elec = await pull("electronics branch", `&category=${elecRoot._id}`);
const all = [...pub, ...elec];
const catOf = (p) => String(p.category?._id || p.category || "");
const known = new Set(all.map((p) => String(p._id)));
const elecIds = new Set(elec.map((p) => String(p._id)));

/* ── isolation ──────────────────────────────────────────────────────── */
console.log(`\n=== isolation ===`);
ok(
  pub.filter((p) => branch.has(catOf(p))).length === 0,
  "no general product is filed inside the branch",
  `${pub.length} checked`
);
ok(
  elec.filter((p) => !branch.has(catOf(p))).length === 0,
  "no branch product is filed outside it",
  `${elec.length} checked`
);
ok(
  pub.filter((p) => elecIds.has(String(p._id))).length === 0,
  "no product appears in both halves",
  `${known.size} distinct`
);

// Each rail is a query written separately, so each can forget separately.
const rails = [
  ["featured rail", "/products/featured?limit=50"],
  ["newest rail", "/products/newest?limit=50"],
  ["best sellers rail", "/products/bestSellers?limit=50"],
  ["most rated rail", "/products/mostRated?limit=50"],
  ["sale rail", "/products/saleProducts?limit=50"],
  ["storefront, unscoped", "/products/storefront?limit=200"],
  ["storefront, cheapest first", "/products/storefront?limit=200&sortBy=priceAsc"],
  ["/products listing", "/products?limit=200"],
];
for (const [label, url] of rails) {
  const rows = (await get(url)).data || [];
  const bad = rows.filter((p) => elecIds.has(String(p._id)));
  ok(bad.length === 0, `${label} shows no electronics`, `${rows.length} shown${bad.length ? `, ${bad.length} leaked` : ""}`);
}

// Search is the one surface meant to reach past the seal, and it doubles as
// the only way to see a product that belongs to neither listing: marked
// electronics but filed under a general department, dropped by both.
const terms = "a e i o u module board cable kit sensor set pack unit resistor capacitor led power switch adapter connector wire tool case fan chip".split(" ");
const strays = new Set();
let hits = 0;
for (const t of terms) {
  for (const p of (await get(`/products/storefront?limit=${LIMIT}&search=${t}`)).data || []) {
    hits += 1;
    if (!known.has(String(p._id))) strays.add(String(p._id));
  }
}
ok(strays.size === 0, "search finds nothing outside both listings", `${hits} hits examined`);

// The tree publishes a count per category; where it disagrees with what the
// listing serves, one of the two is lying to somebody.
const served = new Map();
for (const p of all) served.set(catOf(p), (served.get(catOf(p)) || 0) + 1);
const off = flat.filter(
  (c) => c.productCount !== undefined && c.productCount !== (served.get(String(c._id)) || 0)
);
ok(off.length === 0, "every category's published count is what it serves", `${flat.length} categories`);
for (const c of off.slice(0, 10))
  console.log(`          ${c.name}: says ${c.productCount}, serves ${served.get(String(c._id)) || 0}`);

/* ── duplicates ─────────────────────────────────────────────────────── */
console.log(`\n=== duplicates ===`);

// Invisible bidi marks travel in names pasted out of a mixed-direction
// document and make two identical strings compare unequal, so they come off
// before anything is compared. Punctuation deliberately stays: stripping it
// makes "Fuse (1.5A)" and "Fuse (15A)" the same string, which is two different
// components reported as one duplicate.
const BIDI = /[‎‏‪-‮⁦-⁩]/g;
const norm = (s) => String(s || "").replace(BIDI, "").replace(/\s+/g, " ").trim().toLowerCase();
const lead = (p) => {
  const i = (p.images || [])[0];
  return typeof i === "string" ? i : i?.url || "";
};

const dupes = (rows, key) => {
  const m = new Map();
  for (const p of rows) {
    const k = key(p);
    if (!k) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(p);
  }
  return [...m.values()].filter((v) => v.length > 1).sort((a, b) => b.length - a.length);
};

for (const [label, rows] of [["general", pub], ["electronics", elec], ["both together", all]]) {
  for (const [field, key] of [
    ["sku", (p) => p.sku],
    ["slug", (p) => p.slug],
    ["name", (p) => norm(p.name)],
  ]) {
    const d = dupes(rows, key);
    ok(
      d.length === 0,
      `${label}: no duplicate ${field}`,
      d.length ? `${d.length} group(s), ${d.reduce((s, v) => s + v.length - 1, 0)} extra` : `${rows.length} rows`
    );
    for (const v of d.slice(0, 5)) console.log(`          x${v.length}  ${String(v[0].name).slice(0, 66)}`);
  }
}

// Mongoose appends a small unpadded integer when a slug already exists — the
// fingerprint of the same product saved twice. The import's own row number is
// four zero-padded digits and is not that.
const collided = all.filter((p) => /-\d{1,3}$/.test(String(p.slug || "")));
ok(collided.length === 0, "no slug carries a collision suffix", `${all.length} rows`);
for (const p of collided.slice(0, 5)) console.log(`          ${p.slug}`);

// Same brand, same price, same photograph is one product entered twice far
// more often than it is two products.
const twins = dupes(all, (p) => (p.brand?._id && p.price && lead(p) ? `${p.brand._id}|${p.price}|${lead(p)}` : ""));
ok(twins.length === 0, "no brand+price+photo triplet repeats", `${twins.length} group(s)`);
for (const v of twins.slice(0, 5))
  console.log(`          x${v.length}  ${v.map((p) => String(p.name).slice(0, 30)).slice(0, 2).join("  |  ")}`);

console.log(`\ntotal live products : ${known.size}  (${pub.length} general + ${elec.length} electronics)`);
console.log(`without Arabic name : ${all.filter((p) => !String(p.nameAr || "").trim()).length}`);
console.log(`without any image   : ${all.filter((p) => !(p.images || []).length).length}`);
