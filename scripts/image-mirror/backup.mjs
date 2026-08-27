#!/usr/bin/env node
/**
 * Take a second, independent copy of every photograph the shop renders.
 *
 *   node scripts/backup.mjs
 *   node scripts/backup.mjs --api https://blgomla-api.vercel.app/api
 *   node scripts/backup.mjs --concurrency 12
 *   node scripts/backup.mjs --refresh          # re-fetch even what is on disk
 *   node scripts/backup.mjs --dry-run          # list what would be fetched
 *
 * ## Why this repository exists
 *
 * The catalogue's pictures were hot-linked to the shops they were scraped
 * from, and that is not a hypothetical risk: 139 department photographs on
 * free-electronic.com were deleted at the source before anyone copied them,
 * and no migration will ever bring those back. The product photographs were
 * rescued in time and now sit on our own Cloudinary.
 *
 * Which leaves one copy of seventeen thousand pictures, on one account, with
 * one company. A suspended account, an exceeded free tier, a mistaken bulk
 * delete in the media library — any of those and the catalogue is bare, and
 * the originals are on shops that have already proven they delete things.
 *
 * So: a second copy, in git, on a different company's infrastructure, that
 * nobody has to remember to make. It is also readable over jsDelivr's CDN,
 * which means it is not only an archive — the site can fail over to it.
 *
 * ## How it decides what to fetch
 *
 * It does not carry a list of fields. It walks the public API and treats
 * *every string that looks like an image address* as one, wherever it sits in
 * the response — product photographs, department pictures, brand logos, hero
 * slides, advertisements, mosaic tiles, store banners. A field added to the
 * catalogue next month is backed up the first time this runs afterwards,
 * without anybody editing this file. That is deliberate: a backup that has to
 * be taught about each new kind of picture is a backup that silently misses
 * the newest ones.
 *
 * ## Where a picture lands
 *
 * A Cloudinary address carries its own identity — the public id, which is the
 * name Cloudinary files it under and the name it would have to be restored
 * under. That is the path used here, so the mapping between the live URL and
 * the backup is a string transform in both directions, with nothing to look
 * up:
 *
 *   https://res.cloudinary.com/<cloud>/image/upload/v1787567030/belgomla/products/6a84db…-0.webp
 *   files/belgomla/products/6a84db…-0.webp
 *
 * Nothing is inserted, hashed or renamed on the way. That matters more than
 * the tidiness of the folder: the front end has to be able to turn a live URL
 * into a backup URL at the moment an image fails to load, and a plain prefix
 * swap is a regex it can hold by itself. Any cleverer scheme — a shard, a
 * hash, a lookup — is a second copy of this function living in another
 * repository, and the day the two drift apart every fallback quietly 404s.
 *
 * Anything not on Cloudinary keeps no meaningful name of its own, so it is
 * filed under a hash of its address in `external/`, and the manifest records
 * where it came from. There are about a hundred and fifty of those against
 * seventeen thousand, and the front end never has to compute their names —
 * they are looked up in the manifest, or not needed at all once they move.
 *
 * ## Safe to stop and re-run
 *
 * A file already on disk is not fetched again, so a second run only picks up
 * what is new or what the first run missed. Nothing is deleted, ever — a
 * picture that vanishes from the catalogue stays in the backup, because
 * "removed from the shop" and "gone forever" are not the same event and only
 * one of them is reversible.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { argv, env, exit } from "process";
import { fileURLToPath } from "url";

/* ── settings ───────────────────────────────────────────────────────── */

const flag = (name, fallback = null) => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && argv[at + 1] && !argv[at + 1].startsWith("--")
    ? argv[at + 1]
    : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const HERE = path.dirname(fileURLToPath(import.meta.url));
/*
  Where the pictures are written.

  The script lives on `main`, beside the rest of the shop's code, because a
  scheduled workflow only runs from the default branch. The pictures live on
  the `images` branch, which is checked out into a second directory. So the two
  are not in the same tree and the output root has to be said out loud rather
  than inferred from where this file sits.

  Defaults to the parent of `scripts/` so that running it inside a checkout of
  the images branch alone still does the obvious thing.
*/
const ROOT = path.resolve(flag("out", env.MIRROR_DIR || path.join(HERE, "..")));

const API = (flag("api", env.BELGOMLA_API || "https://blgomla-api.vercel.app/api")).replace(/\/+$/, "");
const CONCURRENCY = Math.max(1, Number(flag("concurrency", env.CONCURRENCY || "8")));
const PAGE_SIZE = Math.max(1, Number(flag("page-size", "200")));
const REFRESH = has("refresh");
const DRY_RUN = has("dry-run");
const FILES = path.join(ROOT, "files");
const EXTERNAL = path.join(ROOT, "external");

/** What a browser sends. Some hosts refuse anything that does not look like one. */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
};

const EXT_FOR_TYPE = {
  "image/webp": ".webp",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/bmp": ".bmp",
  "image/svg+xml": ".svg",
};

const IMAGE_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "gif", "avif", "bmp", "svg",
]);

/* ── which strings are pictures ─────────────────────────────────────── */

/*
  Two ways a string earns a download.

  It is on our Cloudinary — in which case it is ours by definition, whatever
  the path looks like and whether or not it ends in a file extension, because
  Cloudinary addresses do not have to.

  Or it ends in an image extension — which is how every hot-linked address in
  this catalogue looks, and how a scraped address from the next shop will look
  too. Query strings are ignored when testing the ending; `?v=2` does not stop
  a .jpg being a .jpg.

  Data URIs, blobs and relative paths are not addresses this can fetch, and
  placeholder assets served by our own front end are not worth copying.
*/
const SKIP_HOSTS = new Set(
  (flag("skip-hosts", env.SKIP_HOSTS || "blgomla.vercel.app") || "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean)
);

const looksLikeImage = (value) => {
  if (typeof value !== "string" || value.length < 12 || value.length > 2048) return false;
  if (!/^https?:\/\//i.test(value)) return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (SKIP_HOSTS.has(url.hostname)) return false;
  if (url.hostname === "res.cloudinary.com") return true;
  const ext = url.pathname.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTENSIONS.has(ext);
};

/*
  Every image address anywhere in a value, with a note of where it was found.

  The trail ("data[12].images[0].url") is what makes the manifest useful when
  something goes wrong: it says which record and which field an orphaned file
  belonged to, months after the record itself changed.
*/
const harvest = (value, trail, into) => {
  if (value == null) return;
  if (typeof value === "string") {
    if (looksLikeImage(value)) into.push({ url: value, at: trail });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => harvest(item, `${trail}[${index}]`, into));
    return;
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      harvest(item, trail ? `${trail}.${key}` : key, into);
    }
  }
};

/* ── where a picture lands ──────────────────────────────────────────── */

/*
  The public id inside a Cloudinary address.

  The shape is /<cloud>/image/upload/<transformations…>/v<version>/<public id>.<ext>,
  where both the transformations and the version are optional. Everything
  before the public id is delivery instruction, not identity — two addresses
  for the same picture at different sizes are the same file — so the leading
  segments are dropped: `v123456`, and anything shaped like a transformation
  (`w_500`, `c_fill,g_auto`, `f_auto,q_auto`).
*/
const TRANSFORM = /^[a-z]{1,3}_[^/]+$/i;

const publicIdOf = (url) => {
  const marker = "/upload/";
  const at = url.indexOf(marker);
  if (at < 0) return null;
  let rest = url.slice(at + marker.length).split("?")[0].split("#")[0];
  const segments = rest.split("/");
  while (segments.length > 1) {
    const head = segments[0];
    if (/^v\d+$/.test(head) || (TRANSFORM.test(head) && head.includes("_"))) {
      segments.shift();
      continue;
    }
    break;
  }
  const id = segments.join("/");
  return id || null;
};

const extensionOf = (url, contentType) => {
  const declared = String(contentType || "").split(";")[0].trim().toLowerCase();
  if (EXT_FOR_TYPE[declared]) return EXT_FOR_TYPE[declared];
  const ext = url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTENSIONS.has(ext) ? `.${ext === "jpeg" ? "jpg" : ext}` : ".jpg";
};

/**
 * The path in this repository that a given address is filed at.
 * Deterministic and pure — the front end computes the same thing to build a
 * fallback URL, so this function's rules are load-bearing beyond this script.
 */
export const pathFor = (url) => {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    host = "";
  }
  if (host === "res.cloudinary.com") {
    const id = publicIdOf(url);
    if (id) {
      const named = /\.[a-z0-9]{2,5}$/i.test(id) ? id : `${id}${extensionOf(url)}`;
      return path.posix.join("files", named);
    }
  }
  const digest = crypto.createHash("sha1").update(url).digest("hex");
  return path.posix.join("external", digest.slice(0, 2), `${digest}${extensionOf(url)}`);
};

/* ── walking the catalogue ──────────────────────────────────────────── */

/*
  One request, with patience.

  Paging a serverless API a hundred times in a row earns the occasional 500 —
  a cold function, a slow query, a rate limit. Three tries with a growing
  pause; if the page still will not come it is reported and the walk carries
  on, because a page missed is some pictures not backed up this run, while a
  page thrown is every picture not backed up this run.
*/
/*
  A token is optional and usually absent.

  The catalogue is public — /products lists every product with its image
  addresses and asks for no credentials — so this runs with nothing secret in
  the room, which is the whole reason it can live in a workflow file that
  anybody can read.

  What the public listing cannot see is a product that is deactivated, draft
  or otherwise hidden from the storefront. Those have photographs too, and
  their photographs are the ones nobody would notice missing until the product
  is published again. Setting BELGOMLA_TOKEN to an admin token brings them
  into the sweep; leaving it unset backs up everything a visitor can see.
*/
const AUTH = env.BELGOMLA_TOKEN
  ? { Authorization: `Bearer ${env.BELGOMLA_TOKEN}` }
  : {};

const getJson = async (url, label) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", ...AUTH },
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) throw new Error(`answered ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === 3) {
        console.log(`  ! ${label} would not come (${error.message}) — carrying on without it`);
        return null;
      }
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  return null;
};

const rowsOf = (body) => {
  if (!body) return [];
  if (Array.isArray(body)) return body;
  for (const key of ["data", "products", "categories", "brands", "items", "results", "docs"]) {
    if (Array.isArray(body[key])) return body[key];
  }
  return body && typeof body === "object" ? [body] : [];
};

/*
  Where the pictures live.

  `paged` walks until the API stops giving new rows. `flat` asks once with a
  generous limit. The electronics half is a separate entry deliberately: it is
  filed under its own audience and the default product listing hides it, so
  walking /products alone reaches 6,141 of 11,797 products and silently misses
  the rest. Asking for the audience explicitly is how that section is meant to
  be reachable, and it needs no login.
*/
const SOURCES = [
  { label: "products (general)", pathname: "/products", paged: true, query: "" },
  { label: "products (electronics)", pathname: "/products", paged: true, query: "&audience=electronics" },
  { label: "categories", pathname: "/categories", paged: false, query: "?limit=1000" },
  { label: "brands", pathname: "/brands", paged: false, query: "?limit=1000" },
  { label: "collections", pathname: "/collections", paged: false, query: "?limit=1000" },
  { label: "hero slides", pathname: "/hero-slides", paged: false, query: "?limit=200" },
  { label: "advertisements", pathname: "/advertisements", paged: false, query: "?limit=200" },
  { label: "mosaic cards", pathname: "/mosaic-cards", paged: false, query: "?limit=200" },
  { label: "stores", pathname: "/stores", paged: false, query: "?limit=1000" },
  { label: "installation services", pathname: "/installation-services", paged: false, query: "?limit=200" },
];

const inventory = async () => {
  /* url -> { url, refs: [where it was found] }. One file per address, however
     many products point at it — two products sharing a photograph is common
     in a scraped catalogue and is not a reason to store it twice. */
  const found = new Map();
  const note = (hits, source) => {
    for (const hit of hits) {
      const existing = found.get(hit.url);
      if (existing) {
        if (existing.refs.length < 12) existing.refs.push(`${source}:${hit.at}`);
        existing.uses += 1;
      } else {
        found.set(hit.url, { url: hit.url, refs: [`${source}:${hit.at}`], uses: 1 });
      }
    }
  };

  for (const source of SOURCES) {
    let before = found.size;
    if (!source.paged) {
      const body = await getJson(`${API}${source.pathname}${source.query}`, source.label);
      const hits = [];
      for (const [index, row] of rowsOf(body).entries()) harvest(row, `[${index}]`, hits);
      note(hits, source.label);
      console.log(`  ${source.label.padEnd(26)} ${String(found.size - before).padStart(6)} new addresses`);
      continue;
    }

    let page = 1;
    let pages = null;
    for (;;) {
      const body = await getJson(
        `${API}${source.pathname}?limit=${PAGE_SIZE}&page=${page}${source.query}`,
        `${source.label} page ${page}`
      );
      const rows = rowsOf(body);
      if (pages == null && body?.pages) pages = Number(body.pages);
      if (!rows.length) break;
      const hits = [];
      for (const [index, row] of rows.entries()) harvest(row, `[${(page - 1) * PAGE_SIZE + index}]`, hits);
      note(hits, source.label);
      process.stdout.write(`\r  ${source.label.padEnd(26)} page ${page}${pages ? `/${pages}` : ""} — ${found.size} addresses so far   `);
      if (pages && page >= pages) break;
      if (!pages && rows.length < PAGE_SIZE) break;
      page += 1;
      if (page > 500) break; // a runaway-paging backstop, never reached in practice
    }
    process.stdout.write(`\r  ${source.label.padEnd(26)} ${String(found.size - before).padStart(6)} new addresses${" ".repeat(30)}\n`);
  }

  return [...found.values()];
};

/* ── fetching ───────────────────────────────────────────────────────── */

const fetchOne = async (url) => {
  let lastError = "unknown";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: BROWSER_HEADERS,
        redirect: "follow",
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) {
        /* 404 and 410 mean the file is gone at the source. Retrying that is
           just three times the wait for the same answer. */
        if (response.status === 404 || response.status === 410) {
          return { gone: true, status: response.status };
        }
        throw new Error(`answered ${response.status}`);
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length) throw new Error("answered with nothing");
      return { bytes, type: response.headers.get("content-type") };
    } catch (error) {
      lastError = error.message;
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
  return { failed: lastError };
};

const run = async () => {
  console.log(`\nbelgomla image backup`);
  console.log(`  api          ${API}`);
  console.log(`  into         ${ROOT}`);
  console.log(`  concurrency  ${CONCURRENCY}${REFRESH ? "   (refreshing everything)" : ""}${DRY_RUN ? "   (dry run)" : ""}\n`);

  console.log("walking the catalogue…");
  const wanted = await inventory();
  if (!wanted.length) {
    console.log("\nNo image addresses came back at all. That is almost certainly the API being");
    console.log("unreachable rather than a catalogue with no pictures — nothing was written.\n");
    exit(1);
  }

  for (const item of wanted) item.path = pathFor(item.url);

  /* Two addresses can map to one path — the same Cloudinary picture requested
     at two sizes. Keep one, and record that it was reached more than one way. */
  const byPath = new Map();
  for (const item of wanted) {
    const existing = byPath.get(item.path);
    if (existing) {
      existing.uses += item.uses;
      if (existing.refs.length < 12) existing.refs.push(...item.refs.slice(0, 2));
      continue;
    }
    byPath.set(item.path, item);
  }
  const items = [...byPath.values()].sort((a, b) => (a.path < b.path ? -1 : 1));

  const onDisk = items.filter((item) => {
    if (REFRESH) return false;
    try {
      return fs.statSync(path.join(ROOT, item.path)).size > 0;
    } catch {
      return false;
    }
  });
  const todo = REFRESH ? items : items.filter((item) => !onDisk.includes(item));

  console.log(`\n  ${items.length} distinct pictures in the catalogue`);
  console.log(`  ${onDisk.length} already backed up`);
  console.log(`  ${todo.length} to fetch\n`);

  if (DRY_RUN) {
    for (const item of todo.slice(0, 40)) console.log(`  would fetch  ${item.path}`);
    if (todo.length > 40) console.log(`  …and ${todo.length - 40} more`);
    console.log();
    return;
  }

  const gone = [];
  const failed = [];
  let saved = 0;
  let bytesWritten = 0;
  let done = 0;

  const worker = async (queue) => {
    for (;;) {
      const item = queue.shift();
      if (!item) return;
      const result = await fetchOne(item.url);
      done += 1;
      if (result.bytes) {
        const full = path.join(ROOT, item.path);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, result.bytes);
        item.bytes = result.bytes.length;
        item.sha256 = crypto.createHash("sha256").update(result.bytes).digest("hex");
        saved += 1;
        bytesWritten += result.bytes.length;
      } else if (result.gone) {
        gone.push({ ...item, status: result.status });
      } else {
        failed.push({ ...item, why: result.failed });
      }
      if (done % 25 === 0 || done === todo.length) {
        const mb = (bytesWritten / 1048576).toFixed(0);
        process.stdout.write(
          `\r  ${done}/${todo.length}   saved ${saved}   ${mb} MB   gone ${gone.length}   failed ${failed.length}      `
        );
      }
    }
  };

  const queue = [...todo];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
  process.stdout.write("\n\n");

  /* ── the manifest ─────────────────────────────────────────────────── */

  /*
    Rewritten whole every run, sorted by path, so its diff is the change and
    nothing else. Files already on disk keep the size and digest a previous
    run recorded — re-hashing seventeen thousand files to learn what has not
    changed is minutes of nothing.
  */
  let previous = {};
  try {
    const old = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
    for (const entry of old.images || []) previous[entry.path] = entry;
  } catch {
    /* first run */
  }

  const images = items
    .map((item) => {
      const carried = previous[item.path];
      const bytes = item.bytes ?? carried?.bytes ?? null;
      const sha256 = item.sha256 ?? carried?.sha256 ?? null;
      let present = bytes != null;
      if (!present) {
        try {
          present = fs.statSync(path.join(ROOT, item.path)).size > 0;
        } catch {
          present = false;
        }
      }
      if (!present) return null;
      return {
        path: item.path,
        source: item.url,
        publicId: item.url.includes("res.cloudinary.com") ? publicIdOf(item.url) : null,
        bytes,
        sha256,
        uses: item.uses,
        seenAt: item.refs.slice(0, 6),
      };
    })
    .filter(Boolean);

  const totalBytes = images.reduce((sum, entry) => sum + (entry.bytes || 0), 0);
  const stamp = new Date().toISOString();

  fs.writeFileSync(
    path.join(ROOT, "manifest.json"),
    `${JSON.stringify({ generatedAt: stamp, api: API, count: images.length, bytes: totalBytes, images }, null, 1)}\n`
  );

  fs.writeFileSync(
    path.join(ROOT, "summary.json"),
    `${JSON.stringify(
      {
        generatedAt: stamp,
        catalogueImages: items.length,
        backedUp: images.length,
        bytes: totalBytes,
        megabytes: Number((totalBytes / 1048576).toFixed(1)),
        fetchedThisRun: saved,
        goneAtSource: gone.length,
        failedThisRun: failed.length,
      },
      null,
      2
    )}\n`
  );

  /*
    A picture the source no longer has is the whole reason this repository
    exists, so it is written down rather than counted. If it is already in
    `files/` from an earlier run, the backup is the only copy left anywhere
    and that is worth knowing; if it is not, it is lost and the catalogue
    entry pointing at it needs a new picture.
  */
  const rescued = gone.filter((item) => fs.existsSync(path.join(ROOT, item.path)));
  const lost = gone.filter((item) => !fs.existsSync(path.join(ROOT, item.path)));
  const lines = [
    "# Pictures the source no longer serves",
    "",
    `Last checked: ${stamp}`,
    "",
    `- **${rescued.length}** are gone upstream but **held here** — this backup is the only copy left.`,
    `- **${lost.length}** were gone before anything copied them. Those catalogue entries need a new picture.`,
    "",
  ];
  if (lost.length) {
    lines.push("## Lost — no copy anywhere", "");
    for (const item of lost.slice(0, 500)) {
      lines.push(`- \`${item.status}\` ${item.url}`, `  - seen at: ${item.refs[0] || "?"}`);
    }
    if (lost.length > 500) lines.push(`- …and ${lost.length - 500} more`);
    lines.push("");
  }
  if (rescued.length) {
    lines.push("## Held here only", "");
    for (const item of rescued.slice(0, 500)) lines.push(`- \`${item.path}\` ← ${item.url}`);
    if (rescued.length > 500) lines.push(`- …and ${rescued.length - 500} more`);
    lines.push("");
  }
  fs.writeFileSync(path.join(ROOT, "GONE.md"), `${lines.join("\n")}\n`);

  if (failed.length) {
    fs.writeFileSync(
      path.join(ROOT, "failed.json"),
      `${JSON.stringify({ generatedAt: stamp, failed: failed.map((f) => ({ url: f.url, why: f.why })) }, null, 1)}\n`
    );
  } else {
    try {
      fs.unlinkSync(path.join(ROOT, "failed.json"));
    } catch {
      /* nothing to clear */
    }
  }

  console.log(`  backed up      ${images.length} pictures, ${(totalBytes / 1048576).toFixed(1)} MB`);
  console.log(`  new this run   ${saved}`);
  console.log(`  gone at source ${gone.length}  (${rescued.length} held here only, ${lost.length} lost)`);
  console.log(`  failed         ${failed.length}${failed.length ? "  — see failed.json, a re-run will retry them" : ""}`);
  console.log();
};

/* `pathFor` is imported by restore.mjs and mirrored by the front end's
   fallback, so the file has to be importable without starting a run. */
const INVOKED_DIRECTLY = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (INVOKED_DIRECTLY) {
  run().catch((error) => {
    console.error(`\nbackup stopped: ${error?.stack || error}\n`);
    exit(1);
  });
}
