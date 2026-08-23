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
import { createInterface } from "readline";
import { stdin, stdout, argv, env, exit } from "process";

const flag = (name, fallback = null) => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const API = (flag("api", env.BELGOMLA_API || "https://blgomla-api.vercel.app/api")).replace(/\/$/, "");
const HOST = flag("host");
const SCOPE = flag("scope", "all");
const BATCH = Number(flag("batch", "40"));
const CONCURRENCY = Number(flag("concurrency", "4"));

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

const fetchImage = async (url) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(20000),
        redirect: "follow",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length) throw new Error("empty body");
      return { buffer, type: typeOf(url, response.headers.get("content-type")) };
    } catch (error) {
      if (attempt === 3) throw error;
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

const main = async () => {
  await login();

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
