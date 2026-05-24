// Build-time sitemap generator.
// Fetches public products + collections from the live API and writes
// public/sitemap.xml. It NEVER throws — if the API is unreachable it falls
// back to the static routes so the build can't break.
//
// Config (env):
//   SITE_URL          public site origin (default below)
//   SITEMAP_API_URL   API base; falls back to VITE_API_URL
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/sitemap.xml");

const SITE_URL = (
  process.env.SITE_URL || "https://www.belgmla.com"
).replace(/\/$/, "");
const API_URL = (process.env.SITEMAP_API_URL || process.env.VITE_API_URL || "")
  .replace(/\/$/, "");

const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/products", changefreq: "daily", priority: "0.9" },
  { path: "/collections", changefreq: "weekly", priority: "0.8" },
  { path: "/brands", changefreq: "weekly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
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
  if (Array.isArray(json?.data?.data)) return json.data.data;
  return [];
};

const fetchJson = async (url) => {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return unwrap(await res.json());
  } catch (err) {
    console.warn(`[sitemap] skip ${url}: ${err.message}`);
    return [];
  }
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

const main = async () => {
  const entries = [...STATIC_ROUTES];

  if (!API_URL) {
    console.warn(
      "[sitemap] no SITEMAP_API_URL/VITE_API_URL set — writing static routes only"
    );
  } else {
    const [products, collections] = await Promise.all([
      fetchJson(`${API_URL}/products/storefront?limit=10000`),
      fetchJson(`${API_URL}/collections?limit=10000`),
    ]);

    for (const p of products) {
      if (!p?._id) continue;
      entries.push({
        path: `/product/${p._id}`,
        changefreq: "weekly",
        priority: "0.8",
        lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : undefined,
      });
    }
    for (const c of collections) {
      if (!c?._id) continue;
      entries.push({
        path: `/collections/${c._id}`,
        changefreq: "weekly",
        priority: "0.6",
        lastmod: c.updatedAt ? new Date(c.updatedAt).toISOString().slice(0, 10) : undefined,
      });
    }
    console.log(
      `[sitemap] ${products.length} products + ${collections.length} collections`
    );
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(urlEntry),
    "</urlset>",
    "",
  ].join("\n");

  await writeFile(OUT, xml, "utf8");
  console.log(`[sitemap] wrote ${entries.length} URLs to ${OUT}`);
};

main().catch((err) => {
  // Last-resort guard: never fail the build over a sitemap.
  console.warn(`[sitemap] generation failed, keeping existing file: ${err.message}`);
});
