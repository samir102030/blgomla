/**
 * The whole category tree, and where the stock actually sits in it.
 *
 *   node scripts/exportCategories.mjs
 *   node scripts/exportCategories.mjs --out D:/somewhere
 *
 * Reads the public catalogue — no login, nothing written to the shop.
 *
 * ## Two counts, because one of them lies
 *
 * A category's `productCount` is the products filed *directly* under it. A
 * parent whose stock all sits in its children reads zero: the Electronics root
 * reads zero with thousands of products beneath it. Anything that treats that
 * number as "how much is in this department" is wrong about every parent in
 * the tree.
 *
 * So every row carries both. `direct` is what is filed exactly here. `branch`
 * is this category plus everything under it, recursively — which is the number
 * a person means when they ask how big a department is.
 *
 * ## What comes out
 *
 *   categories-tree.txt    the hierarchy, indented, to read
 *   categories.csv         one row per category, to sort and filter
 *   categories.json        the same, for anything that needs to consume it
 */
import fs from "fs";
import path from "path";
import { argv, env, exit } from "process";
import { fileURLToPath } from "url";

const flag = (name, fallback = null) => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = (flag("api", env.BELGOMLA_API || "https://blgomla-api.vercel.app/api")).replace(/\/$/, "");
const OUT = path.resolve(flag("out", path.join(HERE, "..", "..", "..", "blgomla-export")));

const get = async (url) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (response.ok) return await response.json();
    } catch {
      /* retried */
    }
    await new Promise((r) => setTimeout(r, attempt * 1500));
  }
  return null;
};

const parentIdOf = (c) => {
  const p = c.parentCategory;
  if (!p) return null;
  return String(typeof p === "object" ? p._id : p);
};

const isOurs = (url) => typeof url === "string" && url.includes("res.cloudinary.com");

/**
 * Products per category id, counted from the catalogue itself rather than
 * trusted from the category record.
 *
 * Both audiences are walked. The electronics half is hidden from the default
 * listing on purpose, so a count that only read /products would miss every
 * product in that branch and call the whole section empty.
 */
const countProducts = async () => {
  const direct = new Map();
  let total = 0;

  for (const query of ["", "&audience=electronics"]) {
    for (let page = 1; page <= 200; page += 1) {
      const body = await get(`${API}/products?limit=100&page=${page}${query}`);
      if (!body) continue;
      const rows = body.data || [];
      if (!rows.length) break;
      for (const product of rows) {
        total += 1;
        const cat = product.category;
        if (!cat) continue;
        const id = String(typeof cat === "object" ? cat._id : cat);
        direct.set(id, (direct.get(id) || 0) + 1);
      }
      const pages = body.pages || 1;
      if (page >= pages) break;
    }
  }
  return { direct, total };
};

const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });

  console.log(`catalogue: ${API}`);
  const body = await get(`${API}/categories?limit=1000`);
  if (!body) {
    console.error("could not read the categories");
    exit(1);
  }
  const categories = body.data || body.categories || [];
  console.log(`categories: ${categories.length}`);

  process.stdout.write("counting products… ");
  const { direct, total } = await countProducts();
  console.log(`${total} products across ${direct.size} categories`);

  const byId = new Map(categories.map((c) => [String(c._id), c]));
  const kids = new Map();
  const roots = [];
  for (const c of categories) {
    const parent = parentIdOf(c);
    if (parent && byId.has(parent)) {
      if (!kids.has(parent)) kids.set(parent, []);
      kids.get(parent).push(String(c._id));
    } else {
      roots.push(String(c._id));
    }
  }
  for (const list of kids.values()) {
    list.sort((a, b) => (byId.get(a)?.name || "").localeCompare(byId.get(b)?.name || ""));
  }
  roots.sort((a, b) => (byId.get(a)?.sortOrder ?? 0) - (byId.get(b)?.sortOrder ?? 0));

  // Everything in a branch, memoised, refusing to re-enter an id it is inside
  // so a category made its own ancestor cannot spin here.
  const memo = new Map();
  const branchOf = (id, seen = new Set()) => {
    if (memo.has(id)) return memo.get(id);
    if (seen.has(id)) return 0;
    seen.add(id);
    let n = direct.get(id) || 0;
    for (const k of kids.get(id) || []) n += branchOf(k, seen);
    memo.set(id, n);
    return n;
  };

  /* ── the tree, to read ─────────────────────────────────────────────── */

  const lines = [];
  lines.push(`Belgomla — category tree`);
  lines.push(`${categories.length} categories · ${total} products`);
  lines.push("");

  const walk = (id, depth, lastAt) => {
    const c = byId.get(id);
    if (!c) return;
    const children = kids.get(id) || [];
    const d = direct.get(id) || 0;
    const b = branchOf(id);

    // Box-drawing so a deep tree stays readable at a glance.
    let prefix = "";
    for (let i = 0; i < depth; i += 1) prefix += lastAt[i] ? "    " : "│   ";
    if (depth > 0) prefix += lastAt[depth] ? "└── " : "├── ";

    const marks = [];
    if (c.isActive === false) marks.push("hidden");
    if (!isOurs(c.image)) marks.push(c.image ? "picture is a dead link" : "no picture");
    if (b === 0) marks.push("EMPTY");

    lines.push(
      `${prefix}${c.name}` +
        (c.nameAr ? `  ·  ${c.nameAr}` : "") +
        `  [${b}${d !== b ? ` here:${d}` : ""}]` +
        (marks.length ? `  (${marks.join(", ")})` : "")
    );

    children.forEach((child, i) =>
      walk(child, depth + 1, [...lastAt, i === children.length - 1])
    );
  };

  roots.forEach((id, i) => {
    walk(id, 0, [i === roots.length - 1]);
    lines.push("");
  });

  fs.writeFileSync(path.join(OUT, "categories-tree.txt"), lines.join("\n"), "utf8");

  /* ── the table, to sort ────────────────────────────────────────────── */

  const flat = [];
  const flatten = (id, depth, trail) => {
    const c = byId.get(id);
    if (!c) return;
    const here = [...trail, c.name];
    flat.push({
      id,
      level: depth,
      name: c.name || "",
      nameAr: c.nameAr || "",
      parent: trail.length ? trail[trail.length - 1] : "",
      fullPath: here.join(" > "),
      productsHere: direct.get(id) || 0,
      productsInBranch: branchOf(id),
      subCategories: (kids.get(id) || []).length,
      active: c.isActive === false ? "no" : "yes",
      picture: isOurs(c.image) ? "ours" : c.image ? "dead link" : "none",
      slug: c.slug || "",
    });
    for (const k of kids.get(id) || []) flatten(k, depth + 1, here);
  };
  roots.forEach((id) => flatten(id, 0, []));

  const columns = Object.keys(flat[0] || { id: "" });
  const cell = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    columns.join(","),
    ...flat.map((row) => columns.map((k) => cell(row[k])).join(",")),
  ].join("\n");
  // A BOM, so Excel opens the Arabic column as Arabic rather than as mojibake.
  fs.writeFileSync(path.join(OUT, "categories.csv"), "\uFEFF" + csv, "utf8");

  fs.writeFileSync(
    path.join(OUT, "categories.json"),
    JSON.stringify({ api: API, categories: flat }, null, 1),
    "utf8"
  );

  /* ── what the shape says ───────────────────────────────────────────── */

  const empty = flat.filter((r) => r.productsInBranch === 0);
  const noPicture = flat.filter((r) => r.picture !== "ours");
  const parentsHoldingNothingDirectly = flat.filter(
    (r) => r.subCategories > 0 && r.productsHere === 0 && r.productsInBranch > 0
  );

  console.log("");
  console.log(`roots                        : ${roots.length}`);
  console.log(`deepest level                : ${Math.max(...flat.map((r) => r.level))}`);
  console.log(`empty throughout             : ${empty.length}`);
  console.log(`without a picture of ours    : ${noPicture.length}`);
  console.log(`parents whose stock is below : ${parentsHoldingNothingDirectly.length}`);
  console.log("");
  console.log(`written to ${OUT}`);
  for (const f of ["categories-tree.txt", "categories.csv", "categories.json"]) {
    console.log(`  ${f}  ${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0)} KB`);
  }
};

main().catch((error) => {
  console.error(`\nstopped: ${error.message}`);
  exit(1);
});
