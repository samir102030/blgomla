/**
 * Fetch the catalogue's photographs from a connection the server is refused on,
 * and hand them back for filing.
 *
 *   node scripts/imageCourier.mjs
 *   node scripts/imageCourier.mjs --host egyptlaptop.com --scope primary
 *   node scripts/imageCourier.mjs --api https://blgomla-api.vercel.app/api
 *
 * ## Why this exists
 *
 * The dashboard button moves images by asking Cloudinary to fetch the address.
 * That works for the electronics section and moves none of the general
 * catalogue, because the general catalogue sits behind Cloudflare and
 * Cloudflare refuses data centres. Measured three ways: an ordinary home
 * connection got 200 from plain curl with no headers at all, Cloudinary's
 * fetcher got 403, and an unrelated image proxy running in a data centre got
 * 403 too. The request is refused for where it comes from, so no header and no
 * retry from the server will ever get through.
 *
 * This script is the missing address. It runs wherever somebody's normal
 * internet connection is, downloads there, and posts the bytes to the API,
 * which uploads them to Cloudinary and updates the product.
 *
 * ## What it does not need
 *
 * Not the Cloudinary keys, and not the database. Those stay on the server,
 * where they already are. All this holds is a login to the shop's own
 * dashboard, typed here and sent nowhere except that shop's own API — and
 * held only in memory, for as long as the run takes.
 *
 * Safe to stop and re-run. The list it asks for is "images not yet on our
 * Cloudinary", so a second run simply sees a shorter one.
 */
import fs from "fs";
import path from "path";
import { createInterface } from "readline";
import { fileURLToPath } from "url";
import { stdin, stdout, argv, env, exit } from "process";

const flag = (name, fallback = null) => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const HERE = path.dirname(fileURLToPath(import.meta.url));

const API = (flag("api", env.BELGOMLA_API || "https://blgomla-api.vercel.app/api")).replace(/\/$/, "");
const HOST = flag("host");
const SCOPE = flag("scope", "all");
const BATCH = Number(flag("batch", "40"));
const CONCURRENCY = Number(flag("concurrency", "4"));

/*
  --from-cache: send what imageHoard.mjs already downloaded.

  Moving a picture is two jobs. Fetching the bytes off the shop that hosts them
  is slow, connection-bound, and refused to anything running in a data centre —
  hours of work that only an ordinary internet connection can do. Handing them
  to our API to file on Cloudinary is fast, and is the only half that needs a
  login.

  Splitting them means the long half runs unattended, with nothing secret in
  the room, and the half that wants a password is minutes of reading files off
  a local disk. It also means a failed upload never costs a second download.
*/
const FROM_CACHE = argv.includes("--from-cache");
const CACHE = path.resolve(flag("cache", path.join(HERE, "..", "..", "..", "blgomla-images")));

/** What a browser sends. The point of this script is to look like one. */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
};

/* ── the login ──────────────────────────────────────────────────────── */

const ask = (question, hidden = false) =>
  new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true });
    if (hidden) {
      // Echo nothing. A password typed in front of somebody is a password they
      // have, and this script is meant to be run with somebody watching.
      const onData = (char) => {
        if (["\n", "\r", ""].includes(String(char))) stdin.removeListener("data", onData);
        else stdout.write("[2K[200D" + question + "*".repeat(rl.line.length));
      };
      stdin.on("data", onData);
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) stdout.write("\n");
      resolve(answer.trim());
    });
  });

let cookie = "";

const login = async () => {
  const email = env.BELGOMLA_EMAIL || (await ask("admin email: "));
  const password = env.BELGOMLA_PASSWORD || (await ask("password: ", true));

  const response = await fetch(`${API}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`login failed (${response.status}): ${body.slice(0, 200)}`);
  }
  // The API authenticates by cookie, so the cookie is what has to be carried.
  const jar = response.headers.getSetCookie?.() || [response.headers.get("set-cookie")].filter(Boolean);
  cookie = jar.map((line) => String(line).split(";")[0]).join("; ");
  if (!cookie) throw new Error("logged in but the API set no cookie — nothing to authenticate with");
  console.log(`signed in to ${API}\n`);
};

const api = async (path, init = {}) => {
  const response = await fetch(API + path, { ...init, headers: { ...(init.headers || {}), cookie } });
  if (response.status === 401) {
    // A long run outlives its access token. Sign in again and let the caller retry.
    await login();
    return api(path, init);
  }
  return response;
};

/**
 * The same call, but it refuses to hand back anything that is not the JSON it
 * was promised.
 *
 * The first version called .json() on whatever came back. An endpoint that had
 * not finished deploying answered 404 in HTML, .json() threw a parse error
 * about an unexpected '<', and the run ended looking exactly like 'there is
 * nothing to do' — no count, no reason, straight back to the prompt.
 */
const json = async (path, init = {}) => {
  const response = await api(path, init);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      (init.method || 'GET') + ' ' + path + ' answered ' + response.status + ': ' + body.slice(0, 300)
    );
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(path + ' answered ' + response.status + ' but not JSON: ' + body.slice(0, 300));
  }
};

/* ── the work ───────────────────────────────────────────────────────── */

/**
 * What the file is, for a source that does not say.
 *
 * The type has to travel with the bytes. The server accepts image/* and
 * nothing else, and a Blob created without one is announced as
 * application/octet-stream — which is how the first run managed to download
 * every image successfully and have every single one refused on arrival.
 */
const TYPES = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  avif: "image/avif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
};

const typeOf = (url, headerValue) => {
  const declared = String(headerValue || "").split(";")[0].trim().toLowerCase();
  if (declared.startsWith("image/")) return declared;
  const extension = (url.split("?")[0].split(".").pop() || "").toLowerCase();
  return TYPES[extension] || "image/jpeg";
};

/*
  Stop asking a server that has stopped answering.

  The catalogue's pictures are spread over more than one host, and they do not
  fail together: on the afternoon this was written egyptlaptop.com answered in
  0.8s while free-electronic.com did not answer at all — no bytes, no status
  code, twenty seconds of nothing, per image, and about a thousand images.

  Every one of those costs three attempts and two backoffs before it is
  admitted, roughly a minute each. Four at a time, that is most of a working
  day spent waiting on one machine that is switched off — interleaved with the
  host that *is* answering, so the run looks like it is progressing the whole
  time.

  The existing guard does not catch it: `!moved && failed >= items.length`
  gives up only if nothing at all has moved in the entire run, and the healthy
  host keeps `moved` climbing. So a dead host is never noticed.

  A host is written off after DEAD_AFTER consecutive failures with nothing ever
  fetched from it. After that its images are skipped at no cost and reported as
  skipped, not failed — they were never tried, and next week the machine may be
  back on and a re-run will pick them up.
*/
const DEAD_AFTER = 12;
const health = new Map();

const hostOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "(unparseable)";
  }
};

const healthOf = (host) => {
  if (!health.has(host)) health.set(host, { ok: 0, fail: 0, streak: 0, dead: false });
  return health.get(host);
};

const fetchImage = async (url) => {
  const state = healthOf(hostOf(url));
  // One attempt while a host is on its last warning. Three retries are for a
  // server having a bad minute; a server that has refused eleven in a row is
  // not having a bad minute.
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
              `\n  Its images are skipped from here. Re-run when it is back up.\n`
          );
        }
        throw error;
      }
      await new Promise((r) => setTimeout(r, attempt * 800));
    }
  }
};

const deliver = async (item, image) => {
  const form = new FormData();
  // A department picture and a product picture go to different collections.
  form.append("kind", item.kind || "product");
  form.append("productId", item.productId);
  form.append("index", String(item.index));
  form.append(
    "image",
    new Blob([image.buffer], { type: image.type }),
    (item.url.split("/").pop() || "image").split("?")[0] || "image.jpg"
  );

  return json("/upload/migration/push", { method: "POST", body: form });
};

/**
 * Push everything imageHoard.mjs left on disk, and nothing else.
 *
 * The manifest is the list — it already says which product and which slot each
 * file belongs to — so this asks the API for nothing but the uploads. An entry
 * whose file has since been deleted is reported rather than guessed at.
 */
const runFromCache = async () => {
  const manifestPath = path.join(CACHE, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(
      `No manifest at ${manifestPath}.\n` +
        `Run the downloader first — it needs no login:\n` +
        `  node scripts/imageHoard.mjs\n`
    );
    exit(1);
  }

  const rows = JSON.parse(fs.readFileSync(manifestPath, "utf8")).images || [];
  console.log(`cache   : ${CACHE}`);
  console.log(`manifest: ${rows.length} images\n`);

  let moved = 0;
  let failed = 0;
  let missing = 0;
  const problems = [];
  const started = Date.now();

  const queue = [...rows];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const row = queue.shift();
        if (!row) return;
        const file = path.join(CACHE, row.file || "");
        if (!row.file || !fs.existsSync(file)) {
          missing += 1;
          continue;
        }
        try {
          await deliver(
            { productId: row.productId, index: row.index, url: row.url, kind: row.kind },
            { buffer: fs.readFileSync(file), type: row.type || "image/jpeg" }
          );
          moved += 1;
        } catch (error) {
          failed += 1;
          if (problems.length < 10) problems.push(`${error.message}  ${row.url}`);
        }
        const seen = moved + failed;
        if (seen % 50 === 0) {
          const mins = (Date.now() - started) / 60000;
          const rate = mins > 0 ? Math.round(moved / mins) : 0;
          process.stdout.write(`\r  filed ${moved} · failed ${failed} · ${rate}/min   `);
        }
      }
    })
  );

  console.log(`\n\nfiled   : ${moved}`);
  console.log(`failed  : ${failed}`);
  if (missing) console.log(`missing : ${missing}  (in the manifest, not on disk)`);
  if (problems.length) {
    console.log("\nfirst problems:");
    for (const line of problems) console.log(`  ${line}`);
  }
};

const main = async () => {
  await login();

  if (FROM_CACHE) {
    const status = await json("/upload/migration/status");
    if (!status.configured) {
      console.error(
        "The server has no image storage configured yet. Add the three CLOUDINARY_* settings and redeploy first."
      );
      exit(1);
    }
    return runFromCache();
  }

  const status = await json("/upload/migration/status");
  if (!status.configured) {
    console.error(
      "The server has no image storage configured yet. Add the three CLOUDINARY_* settings and redeploy first."
    );
    exit(1);
  }
  console.log("hosts:");
  for (const h of status.hosts || []) {
    console.log(
      `  ${h.host.padEnd(28)} ${String(h.count).padStart(6)}  ${
        h.reachable ? "the server can reach this one itself" : `blocked from the server (${h.status || "no answer"})`
      }`
    );
  }
  if (HOST) console.log(`\nrunning against ${HOST} only`);
  console.log("");

  let moved = 0;
  let failed = 0;
  let skipped = 0;
  const problems = [];

  for (;;) {
    const query = new URLSearchParams({ limit: String(BATCH), scope: SCOPE });
    if (HOST) query.set("host", HOST);
    const batch = await json(`/upload/migration/pending?${query}`);
    const items = batch.items || [];
    if (!items.length) {
      console.log(`nothing left to fetch (${batch.remaining ?? 0} outstanding)`);
      break;
    }
    console.log(`fetching ${items.length} of ${batch.remaining} outstanding...`);

    const queue = [...items];
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        while (queue.length) {
          const item = queue.shift();
          if (!item) return;
          // Written off earlier in this run — do not spend twenty seconds
          // finding that out again.
          if (healthOf(hostOf(item.url)).dead) {
            skipped += 1;
            continue;
          }
          try {
            const image = await fetchImage(item.url);
            await deliver(item, image);
            moved += 1;
          } catch (error) {
            failed += 1;
            if (problems.length < 10) problems.push(`${error.message}  ${item.url}`);
          }
          const seen = moved + failed;
          if (seen % 25 === 0) console.log(`  moved ${moved}  failed ${failed}`);
        }
      })
    );
    console.log(`  moved ${moved}  failed ${failed}`);
    // Say it as it happens rather than only in the summary: a run failing on
    // every image should not take ten minutes to admit it.
    if (problems.length) console.log(`  last problem: ${problems[problems.length - 1]}`);

    // Nothing in this batch worked. Repeating it would only ask the same
    // questions of the same server and get the same answers.
    if (!moved && failed >= items.length) break;
  }

  console.log(`\n\nmoved  : ${moved}`);
  console.log(`failed : ${failed}`);
  if (problems.length) {
    console.log("\nfirst problems:");
    for (const line of problems) console.log(`  ${line}`);
  }
};

main().catch((error) => {
  console.error(`\nstopped: ${error.message}`);
  if (error.cause) console.error(String(error.cause));
  exit(1);
});
