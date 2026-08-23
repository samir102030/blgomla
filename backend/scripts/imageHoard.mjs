/**
 * Download every catalogue photograph to this machine, so the slow half of the
 * migration is done before anyone has to log in.
 *
 *   node scripts/imageHoard.mjs
 *   node scripts/imageHoard.mjs --out D:/blgomla-images
 *   node scripts/imageHoard.mjs --concurrency 8
 *
 * ## Why this is a separate script from imageCourier
 *
 * Moving a picture takes two things: fetching the bytes from the shop they are
 * currently hosted on, and handing them to our own API to file on Cloudinary.
 * Only the second needs a login. Only the first is blocked.
 *
 * The hosts refuse data centres — Cloudflare, keyed on where the request comes
 * from, proven three ways — so the server can never fetch them, no matter what
 * headers it sends. An ordinary home connection gets 200 in under a second.
 * And the catalogue is public: GET /api/products lists every product with its
 * image addresses and asks for no credentials at all.
 *
 * So the hours-long, connection-bound half can be done by anyone, unattended,
 * with nothing secret in the room. What is left afterwards is reading files off
 * a local disk and posting them, which is minutes, and that is the only part
 * that needs the dashboard login:
 *
 *   node scripts/imageCourier.mjs --from-cache
 *
 * ## Where it writes
 *
 * Outside the repository by default — ../../blgomla-images relative to the
 * backend folder. Deliberately: roughly two gigabytes of photographs do not
 * belong in git, where every version is kept forever and every deployment
 * clones the lot.
 *
 * Safe to stop and re-run. A file already on disk is not fetched again, so a
 * second run only picks up what the first one missed.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { argv, env, exit } from "process";
import { fileURLToPath } from "url";

const flag = (name, fallback = null) => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = (flag("api", env.BELGOMLA_API || "https://blgomla-api.vercel.app/api")).replace(/\/$/, "");
const OUT = path.resolve(flag("out", path.join(HERE, "..", "..", "..", "blgomla-images")));
const CONCURRENCY = Number(flag("concurrency", "6"));
const PAGE_SIZE = Number(flag("page-size", "100"));

/** What a browser sends. The point of this script is to look like one. */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
};

const EXT = {
  "image/webp": ".webp",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/bmp": ".bmp",
};

const TYPES = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  avif: "image/avif",
  bmp: "image/bmp",
};

const typeOf = (url, headerValue) => {
  const declared = String(headerValue || "").split(";")[0].trim().toLowerCase();
  if (declared.startsWith("image/")) return declared;
  const extension = (url.split("?")[0].split(".").pop() || "").toLowerCase();
  return TYPES[extension] || "image/jpeg";
};

/*
  The filename is a hash of the address.

  Product names are not safe filenames — they carry slashes, quotes, Arabic and
  ASCII in the same string — and two products can point at the same picture.
  A hash of the URL is stable across runs, unique per address, and is what
  makes "already downloaded" a question the filesystem can answer on its own.
*/
const nameFor = (url, type) =>
  crypto.createHash("sha1").update(url).digest("hex") + (EXT[type] || ".jpg");

const hostOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "(unparseable)";
  }
};

/* ── the list ───────────────────────────────────────────────────────── */

/*
  One page, with patience.

  Paging a serverless API sixty times in a row is enough to earn the occasional
  500 — a cold function, a slow query, a rate limit. The first version threw on
  the first one, which on the first real run meant fifteen thousand images
  listed and then discarded because page 47 was briefly unhappy.

  Three tries with a growing pause, and if the page still will not come, it is
  reported and the walk carries on. A page missed is some products not fetched
  this time; a page thrown is every product not fetched this time.
*/
const fetchPage = async (page, query = "") => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${API}/products?limit=${PAGE_SIZE}&page=${page}${query}`, {
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) throw new Error(`answered ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === 3) {
        console.log(`\n  page ${page} would not come (${error.message}) — carrying on without it`);
        return null;
      }
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  return null;
};

/*
  Both halves of the catalogue.

  The electronics section is a normal part of the shop filed under its own
  audience, and the default listing hides it — deliberately, so it stays out of
  the menus until it is published. Which means walking /products alone reaches
  6,141 of 11,797 products and silently misses the rest.

  Asking for the audience explicitly is how the section is meant to be
  reachable, and it is public: ?audience=electronics answers 5,656 without a
  login, same as the general half.

  Their pictures come from different places and fail at different times —
  egyptlaptop.com for the general half, free-electronic.com for electronics,
  and the second was refusing connections outright for part of one afternoon.
  All the more reason for one pass to cover both: whichever is up gets fetched,
  and a re-run picks up whatever was not.
*/
const AUDIENCES = [
  { label: "general", query: "" },
  { label: "electronics", query: "&audience=electronics" },
];

const listEverything = async () => {
  const wanted = [];
  const seen = new Set();
  const lost = [];

  for (const audience of AUDIENCES) {
    const before = wanted.length;
    await listOne(audience, wanted, seen, lost);
    console.log(`  ${audience.label.padEnd(12)} ${wanted.length - before} images to move`);
  }

  if (lost.length) {
    console.log(
      `  ${lost.length} page(s) never came: ${lost.join(", ")}.` +
        ` Re-run later and they will be picked up — everything already on disk is kept.`
    );
  }
  return wanted;
};

const listOne = async ({ label, query }, wanted, seen, lost) => {
  let page = 1;
  let pages = 1;

  do {
    const body = await fetchPage(page, query);
    if (!body) {
      lost.push(`${label}:${page}`);
      page += 1;
      continue;
    }
    const items = body.data || body.products || [];
    pages = body.pages || Math.ceil((body.total || 0) / PAGE_SIZE) || 1;

    for (const product of items) {
      (product.images || []).forEach((image, index) => {
        const url = image?.url;
        if (!url) return;
        // Already ours. Nothing to fetch and nothing to move.
        if (url.includes("res.cloudinary.com")) return;
        const key = `${product._id}:${index}`;
        if (seen.has(key)) return;
        seen.add(key);
        wanted.push({ productId: product._id, index, url });
      });
    }

    process.stdout.write(
      `\r  listing ${label}… page ${page}/${pages}, ${wanted.length} images`
    );
    page += 1;
  } while (page <= pages);

  process.stdout.write("\r[2K");
};

/* ── the download ───────────────────────────────────────────────────── */

/*
  Same circuit breaker as the courier: a host that has refused a dozen in a row
  and never given us anything is switched off, not slow, and every further
  request costs twenty seconds to learn that again.
*/
const DEAD_AFTER = 12;
const health = new Map();
const healthOf = (host) => {
  if (!health.has(host)) health.set(host, { ok: 0, fail: 0, streak: 0, dead: false });
  return health.get(host);
};

const download = async (url) => {
  const state = healthOf(hostOf(url));
  const attempts = state.streak >= DEAD_AFTER / 2 ? 1 : 3;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(20000),
        redirect: "follow",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length) throw new Error("empty body");
      state.ok += 1;
      state.streak = 0;
      return { buffer, type: typeOf(url, response.headers.get("content-type")) };
    } catch (error) {
      if (attempt === attempts) {
        state.fail += 1;
        state.streak += 1;
        if (!state.dead && state.ok === 0 && state.streak >= DEAD_AFTER) {
          state.dead = true;
          console.log(
            `\n  giving up on ${hostOf(url)} — ${state.streak} in a row, none ever fetched.` +
              `\n  Skipping the rest of its images. Re-run when it is back up.\n`
          );
        }
        throw error;
      }
      await new Promise((r) => setTimeout(r, attempt * 800));
    }
  }
};

/* ── the run ────────────────────────────────────────────────────────── */

const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const manifestPath = path.join(OUT, "manifest.json");

  // A manifest from an earlier run is what makes this resumable without
  // re-reading two gigabytes off the disk to find out what is there.
  const already = new Map();
  if (fs.existsSync(manifestPath)) {
    try {
      for (const row of JSON.parse(fs.readFileSync(manifestPath, "utf8")).images || []) {
        if (row?.file && fs.existsSync(path.join(OUT, row.file))) {
          already.set(`${row.productId}:${row.index}`, row);
        }
      }
      console.log(`resuming: ${already.size} already on disk\n`);
    } catch {
      console.log("manifest unreadable — starting the index again\n");
    }
  }

  console.log(`catalogue : ${API}`);
  console.log(`writing to: ${OUT}\n`);

  const wanted = await listEverything();
  const byHost = {};
  for (const item of wanted) byHost[hostOf(item.url)] = (byHost[hostOf(item.url)] || 0) + 1;
  console.log("\nstill hosted elsewhere:");
  for (const [host, count] of Object.entries(byHost).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${host.padEnd(28)} ${String(count).padStart(6)}`);
  }

  const todo = wanted.filter((item) => !already.has(`${item.productId}:${item.index}`));

  /*
    Fetch each address once, not once per product that names it.

    Products in this catalogue share photographs — the same picture stands for
    a router and for the bundle it ships in — and the manifest is keyed by
    product and slot, so the same URL appears under several keys. Downloading
    per key meant asking egyptlaptop.com for the identical file two and three
    times: measured mid-run, 8,297 rows had produced only 5,194 distinct files,
    so about a third of the traffic was re-fetching bytes already on the disk.

    Grouped by address instead. One download, then a manifest row for every
    product and slot that pointed at it.
  */
  const byUrl = new Map();
  for (const item of todo) {
    if (!byUrl.has(item.url)) byUrl.set(item.url, []);
    byUrl.get(item.url).push(item);
  }

  console.log(
    `\n${todo.length} to fetch across ${byUrl.size} distinct addresses` +
      ` (${already.size} already here)\n`
  );

  const rows = [...already.values()];
  let done = 0;
  let failed = 0;
  let skipped = 0;
  let bytes = rows.reduce((sum, row) => sum + (row.bytes || 0), 0);
  const started = Date.now();
  const problems = [];

  const queue = [...byUrl.entries()];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const entry = queue.shift();
        if (!entry) return;
        const [url, items] = entry;

        if (healthOf(hostOf(url)).dead) {
          skipped += items.length;
          continue;
        }
        try {
          const image = await download(url);
          const file = nameFor(url, image.type);
          fs.writeFileSync(path.join(OUT, file), image.buffer);
          // One file, a row for each product and slot that named it.
          for (const item of items) {
            rows.push({
              productId: item.productId,
              index: item.index,
              url,
              file,
              type: image.type,
              bytes: image.buffer.length,
            });
          }
          bytes += image.buffer.length;
          done += items.length;
        } catch (error) {
          failed += items.length;
          if (problems.length < 10) problems.push(`${error.message}  ${url}`);
        }

        const seen = done + failed + skipped;
        if (seen % 50 < items.length) {
          const mins = (Date.now() - started) / 60000;
          const rate = mins > 0 ? Math.round(done / mins) : 0;
          const left = rate > 0 ? Math.round((todo.length - seen) / rate) : 0;
          process.stdout.write(
            `\r  ${done} fetched · ${failed} failed · ${skipped} skipped · ` +
              `${(bytes / 1048576).toFixed(0)} MB · ${rate}/min · ~${left} min left   `
          );
          // Written as it goes, so a run stopped halfway is not a run wasted.
          fs.writeFileSync(manifestPath, JSON.stringify({ api: API, images: rows }, null, 1));
        }
      }
    })
  );

  fs.writeFileSync(manifestPath, JSON.stringify({ api: API, images: rows }, null, 1));

  console.log(`\n\nfetched : ${done}`);
  console.log(`failed  : ${failed}`);
  if (skipped) console.log(`skipped : ${skipped}  (host given up on)`);
  console.log(`on disk : ${rows.length} files, ${(bytes / 1048576).toFixed(0)} MB`);
  console.log(`manifest: ${manifestPath}`);
  if (problems.length) {
    console.log("\nfirst problems:");
    for (const line of problems) console.log(`  ${line}`);
  }
  console.log(
    `\nNext, to file them on Cloudinary (this is the part that needs the dashboard login):\n` +
      `  node scripts/imageCourier.mjs --from-cache --cache ${OUT}\n`
  );
};

main().catch((error) => {
  console.error(`\nstopped: ${error.message}`);
  if (error.cause) console.error(String(error.cause));
  exit(1);
});
