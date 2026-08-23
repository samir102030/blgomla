// Build-time sitemap and robots generator.
//
// Fetches the public catalogue from the live API and writes public/sitemap.xml
// and public/robots.txt. It NEVER throws — if the API is unreachable it falls
// back to the static routes so the build cannot break over a sitemap.
//
// Config (env):
//   SITE_URL          public site origin. SET THIS AT LAUNCH.
//   SITEMAP_API_URL   API base; falls back to VITE_API_URL, then to the
//                     production API, because in production VITE_API_URL is
//                     the relative "/api" and cannot be fetched from a build.
//
// ## What was wrong
//
// The published sitemap had five URLs on a domain this shop does not use, and
// robots.txt pointed crawlers at that same domain's sitemap. Three separate
// causes, all of them here:
//
//   * SITE_URL defaulted to the old shop's domain, so every <loc> named it.
//   * API_URL resolved to "/api" — the relative value the browser uses — which
//     is not fetchable from a build script, so every catalogue request failed,
//     was swallowed by the warn-and-continue guard, and left only the five
//     static routes.
//   * robots.txt was a hand-written file that nothing kept in step with it.
//
// So 11,797 products had no sitemap coverage at all, and what coverage existed
// pointed somewhere else.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/sitemap.xml");
const ROBOTS_OUT = resolve(__dirname, "../public/robots.txt");

/*
  The origin every URL in the sitemap is written against.

  Defaults to where the shop actually is today rather than where it is going,
  because a sitemap naming a domain that serves a different shop is worse than
  one naming a temporary address. Set SITE_URL in the build environment the day
  the real domain is connected — it is the only change needed here.
*/
const SITE_URL = (process.env.SITE_URL || "https://blgomla.vercel.app").replace(/\/$/, "");

/*
  In production VITE_API_URL is "/api" — correct for a browser on the site,
  useless to a build script with no origin to resolve it against. A relative
  value is therefore treated as absent.
*/
const RAW_API = (process.env.SITEMAP_API_URL || process.env.VITE_API_URL || "").replace(/\/$/, "");
const API_URL = /^https?:\/\//.test(RAW_API) ? RAW_API : "https://blgomla-api.vercel.app/api";

const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/products", changefreq: "daily", priority: "0.9" },
  { path: "/deals", changefreq: "daily", priority: "0.8" },
  { path: "/collections", changefreq: "weekly", priority: "0.8" },
  { path: "/installations", changefreq: "weekly", priority: "0.7" },
  { path: "/brands", changefreq: "weekly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
];

/** Paths a crawler has no business in — the same list robots.txt disallows. */
const PRIVATE_PATHS = [
  "/admin",
  "/vendor",
  "/dashboard",
  "/checkout",
  "/cart",
  "/account",
  "/login",
  "/orders",
  "/order-confirmation",
  "/api/",
];

const xmlEscape = (s) =>
  String(s).replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])
  );

// Tolerates the various envelope shapes used across this codebase.
const unwrap = (json) => {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.products)) return json.products;
  if (Array.isArray(json?.collections)) return json.collections;
  if (Array.isArray(json?.tree)) return json.tree;
  if (Array.isArray(json?.data?.data)) return json.data.data;
  return [];
};

const fetchJson = async (url) => {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[sitemap] skip ${url}: ${err.message}`);
    return null;
  }
};

/**
 * Every product in one half of the catalogue, a page at a time.
 *
 * Asked for in pages of 500 rather than one request for ten thousand: the
 * catalogue is 11,797 products and a single response that size is a slow
 * request that fails as a unit, whereas a page that fails costs one page.
 */
const fetchAllProducts = async (extra = "") => {
  const out = [];
  for (let page = 1; page <= 60; page += 1) {
    const json = await fetchJson(
      `${API_URL}/products/storefront?limit=500&page=${page}&sortBy=newest${extra}`
    );
    const rows = unwrap(json);
    out.push(...rows);
    if (!rows.length || out.length >= (json?.total ?? 0) || page >= (json?.pages ?? 1)) break;
  }
  return out;
};

const urlEntry = ({ path, changefreq, priority, lastmod }) =>
  [
    "  <url>",
    `    <loc>${xmlEscape(SITE_URL + path)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");

const day = (value) => (value ? new Date(value).toISOString().slice(0, 10) : undefined);

const main = async () => {
  const entries = [...STATIC_ROUTES];

  // The category tree first, because it names the electronics section's root —
  // the products under it are hidden from the general listing and have to be
  // asked for by category, which is 5,656 products that would otherwise be
  // missing from the sitemap entirely.
  const tree = unwrap(await fetchJson(`${API_URL}/categories/tree`));
  const electronicsRoot = tree.find((r) => r?.sectionKey === "electronics")?._id;

  const flatten = (nodes, into = []) => {
    for (const node of nodes || []) {
      if (node?._id) into.push(node);
      flatten(node?.children, into);
    }
    return into;
  };
  for (const category of flatten(tree)) {
    entries.push({
      path: `/products?category=${category._id}`,
      changefreq: "weekly",
      priority: "0.6",
    });
  }

  const [general, electronics, collectionsJson] = await Promise.all([
    fetchAllProducts(""),
    electronicsRoot ? fetchAllProducts(`&category=${electronicsRoot}`) : Promise.resolve([]),
    fetchJson(`${API_URL}/collections?limit=1000`),
  ]);

  const seen = new Set();
  for (const p of [...general, ...electronics]) {
    if (!p?._id || seen.has(String(p._id))) continue;
    seen.add(String(p._id));
    entries.push({
      path: `/product/${p._id}`,
      changefreq: "weekly",
      priority: "0.8",
      lastmod: day(p.updatedAt),
    });
  }

  for (const c of unwrap(collectionsJson)) {
    if (!c?._id) continue;
    entries.push({
      path: `/collections/${c._id}`,
      changefreq: "weekly",
      priority: "0.6",
      lastmod: day(c.updatedAt),
    });
  }

  console.log(
    `[sitemap] ${seen.size} products (${general.length} general + ${electronics.length} electronics), ` +
      `${flatten(tree).length} categories, ${unwrap(collectionsJson).length} collections`
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(urlEntry),
    "</urlset>",
    "",
  ].join("\n");

  await writeFile(OUT, xml, "utf8");

  // robots.txt is written here too, so its Sitemap line can never again name a
  // different host from the one the sitemap was built for. It used to be a
  // hand-maintained file and it drifted to the old shop's domain.
  const robots = [
    "User-agent: *",
    "Allow: /",
    ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
  await writeFile(ROBOTS_OUT, robots, "utf8");

  console.log(`[sitemap] wrote ${entries.length} URLs to ${OUT}`);
  console.log(`[sitemap] robots.txt points at ${SITE_URL}/sitemap.xml`);
};

main().catch((err) => {
  // Last-resort guard: never fail the build over a sitemap.
  console.warn(`[sitemap] generation failed, keeping existing files: ${err.message}`);
});
