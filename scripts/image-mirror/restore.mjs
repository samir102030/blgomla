#!/usr/bin/env node
/**
 * Put the backup back on Cloudinary, under the names the catalogue already
 * points at.
 *
 *   CLOUDINARY_URL=cloudinary://key:secret@cloud  node scripts/restore.mjs --dry-run
 *   CLOUDINARY_URL=cloudinary://key:secret@cloud  node scripts/restore.mjs
 *   ... node scripts/restore.mjs --only belgomla/categories
 *   ... node scripts/restore.mjs --missing-only
 *
 * ## The half of a backup that is usually missing
 *
 * A pile of files nobody has ever restored is not a backup, it is a hope. The
 * point of filing each picture under its Cloudinary public id is that putting
 * it back is not a migration: the same bytes go up under the same id, every
 * address already stored on every product keeps working, and the database is
 * never touched. Nothing has to be re-linked, so nothing can be re-linked
 * wrong.
 *
 * Run it after the sort of afternoon where the media library was bulk-deleted,
 * or the account lapsed and was rebuilt. `--missing-only` asks Cloudinary what
 * it is actually missing first and sends only that, which is what you want
 * when part of the library survived.
 *
 * ## What it needs
 *
 * Cloudinary credentials, and nothing else — no database, no login to the
 * shop, no server. Either `CLOUDINARY_URL`, or the three variables the backend
 * already uses:
 *
 *   CLOUDINARY_CLOUD_NAME  CLOUDINARY_API_KEY  CLOUDINARY_API_SECRET
 *
 * Pass them on the command line and they end up in your shell history. Set
 * them in the environment for the one command instead.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { argv, env, exit } from "process";
import { fileURLToPath } from "url";

const flag = (name, fallback = null) => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && argv[at + 1] && !argv[at + 1].startsWith("--") ? argv[at + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const HERE = path.dirname(fileURLToPath(import.meta.url));
/* The checkout of the images branch to send back up. See backup.mjs. */
const ROOT = path.resolve(flag("from", env.MIRROR_DIR || path.join(HERE, "..")));
const DRY_RUN = has("dry-run");
const MISSING_ONLY = has("missing-only");
const ONLY = flag("only");
const CONCURRENCY = Math.max(1, Number(flag("concurrency", "5")));

/* ── credentials ────────────────────────────────────────────────────── */

const credentials = () => {
  const url = env.CLOUDINARY_URL;
  if (url) {
    const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (!match) {
      console.error("CLOUDINARY_URL is set but is not cloudinary://key:secret@cloud");
      exit(1);
    }
    return { key: match[1], secret: match[2], cloud: match[3].replace(/\/.*$/, "") };
  }
  const cloud = env.CLOUDINARY_CLOUD_NAME;
  const key = env.CLOUDINARY_API_KEY;
  const secret = env.CLOUDINARY_API_SECRET;
  if (cloud && key && secret) return { cloud, key, secret };
  console.error(
    "No Cloudinary credentials. Set CLOUDINARY_URL, or CLOUDINARY_CLOUD_NAME +\n" +
      "CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET, and run again."
  );
  exit(1);
  return null;
};

/*
  Cloudinary signs an upload by sorting the parameters it was given, joining
  them k=v&k=v, appending the api secret and taking the SHA-1 of the lot. The
  file, the api key and the cloud name are not part of it.
*/
const sign = (params, secret) => {
  const body = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(`${body}${secret}`).digest("hex");
};

/* ── what there is to send ──────────────────────────────────────────── */

/**
 * The Cloudinary public id a backed-up file belongs at: its path under
 * `files/`, without the extension. Cloudinary derives the format from the
 * bytes, and carries no extension in the id itself.
 */
const publicIdOfPath = (relative) => {
  const withoutRoot = relative.replace(/^files\//, "");
  return withoutRoot.replace(/\.[a-z0-9]{2,5}$/i, "");
};

const walk = (dir, into = []) => {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return into;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, into);
    else if (entry.isFile()) into.push(full);
  }
  return into;
};

const inventory = () => {
  /*
    The manifest is the better list — it carries the address each file came
    from and the digest it had when it was written. But a restore has to work
    on a checkout of this repository alone, even one where the manifest was
    lost or was never written, so the directory is the fallback.
  */
  let entries = [];
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
    entries = (manifest.images || [])
      .filter((entry) => entry.path?.startsWith("files/"))
      .map((entry) => ({ path: entry.path, publicId: entry.publicId || publicIdOfPath(entry.path) }));
  } catch {
    /* handled by the walk below */
  }
  /*
    An empty answer from the manifest is not the same as an empty backup — a
    truncated, stale or half-written manifest reads exactly like a catalogue
    with no pictures in it, and quietly restoring nothing is the worst thing
    this script could do on the day it is needed. The files on disk are the
    authority; the manifest is only a shortcut to them.
  */
  if (!entries.length) {
    entries = walk(path.join(ROOT, "files"))
      .map((full) => path.relative(ROOT, full).split(path.sep).join("/"))
      .map((relative) => ({ path: relative, publicId: publicIdOfPath(relative) }));
  }
  entries = entries.filter((entry) => fs.existsSync(path.join(ROOT, entry.path)));
  if (ONLY) entries = entries.filter((entry) => entry.publicId.startsWith(ONLY));
  return entries.sort((a, b) => (a.publicId < b.publicId ? -1 : 1));
};

/* ── talking to Cloudinary ──────────────────────────────────────────── */

const uploadOne = async ({ path: relative, publicId }, { cloud, key, secret }) => {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  const timestamp = Math.floor(Date.now() / 1000);
  /*
    overwrite + invalidate: put the bytes back at the same id and tell the CDN
    the old answer is wrong. Without invalidate, an edge that cached a 404
    during the outage keeps serving it for hours after the picture is back.
  */
  const params = { public_id: publicId, timestamp, overwrite: "true", invalidate: "true" };
  const form = new FormData();
  for (const [name, value] of Object.entries(params)) form.append(name, String(value));
  form.append("api_key", key);
  form.append("signature", sign(params, secret));
  form.append("file", new Blob([bytes]), path.basename(relative));

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(120000),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok) return { ok: true, url: body.secure_url };
      /* A rejected signature or a bad id will be rejected again just as fast. */
      if (response.status === 400 || response.status === 401) {
        return { ok: false, why: body?.error?.message || `answered ${response.status}` };
      }
      throw new Error(body?.error?.message || `answered ${response.status}`);
    } catch (error) {
      if (attempt === 3) return { ok: false, why: error.message };
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  return { ok: false, why: "unknown" };
};

/*
  Which ids Cloudinary already holds.

  The admin API lists a folder 500 at a time. Asking it once up front costs a
  few seconds and can turn a seventeen-thousand-file restore into a
  two-hundred-file one, which is the difference between a run you watch and a
  run you schedule.
*/
const alreadyThere = async ({ cloud, key, secret }) => {
  const held = new Set();
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  let cursor = null;
  for (let guard = 0; guard < 200; guard += 1) {
    const url = new URL(`https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload`);
    url.searchParams.set("max_results", "500");
    if (ONLY) url.searchParams.set("prefix", ONLY);
    if (cursor) url.searchParams.set("next_cursor", cursor);
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) {
      console.log(`  ! could not list what Cloudinary holds (${response.status}) — sending everything`);
      return null;
    }
    const body = await response.json();
    for (const resource of body.resources || []) held.add(resource.public_id);
    cursor = body.next_cursor;
    process.stdout.write(`\r  listing what Cloudinary already holds… ${held.size}   `);
    if (!cursor) break;
  }
  process.stdout.write("\n");
  return held;
};

/* ── the run ────────────────────────────────────────────────────────── */

const run = async () => {
  const account = credentials();
  const entries = inventory();

  console.log(`\nbelgomla image restore`);
  console.log(`  cloud    ${account.cloud}`);
  console.log(`  from     ${ROOT}`);
  console.log(`  files    ${entries.length}${ONLY ? `   (only ${ONLY})` : ""}${DRY_RUN ? "   (dry run)" : ""}\n`);

  if (!entries.length) {
    console.log("Nothing to restore — no backed-up files matched.\n");
    return;
  }

  let todo = entries;
  if (MISSING_ONLY) {
    const held = await alreadyThere(account);
    if (held) {
      todo = entries.filter((entry) => !held.has(entry.publicId));
      console.log(`  ${entries.length - todo.length} already on Cloudinary, ${todo.length} missing\n`);
    }
  }

  if (DRY_RUN) {
    for (const entry of todo.slice(0, 40)) console.log(`  would send  ${entry.publicId}`);
    if (todo.length > 40) console.log(`  …and ${todo.length - 40} more`);
    console.log(`\n  ${todo.length} files, ${(
      todo.reduce((sum, entry) => sum + (fs.statSync(path.join(ROOT, entry.path)).size || 0), 0) / 1048576
    ).toFixed(1)} MB\n`);
    return;
  }

  let done = 0;
  let sent = 0;
  const failed = [];
  const queue = [...todo];

  const worker = async () => {
    for (;;) {
      const entry = queue.shift();
      if (!entry) return;
      const result = await uploadOne(entry, account);
      done += 1;
      if (result.ok) sent += 1;
      else failed.push({ ...entry, why: result.why });
      if (done % 10 === 0 || done === todo.length) {
        process.stdout.write(`\r  ${done}/${todo.length}   sent ${sent}   failed ${failed.length}      `);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write("\n\n");

  console.log(`  restored  ${sent}`);
  console.log(`  failed    ${failed.length}`);
  for (const entry of failed.slice(0, 20)) console.log(`    ${entry.publicId} — ${entry.why}`);
  if (failed.length > 20) console.log(`    …and ${failed.length - 20} more`);
  console.log();
  if (failed.length) exit(1);
};

run().catch((error) => {
  console.error(`\nrestore stopped: ${error?.stack || error}\n`);
  exit(1);
});
