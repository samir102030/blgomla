/**
 * Put back what scripts/dumpAll.mjs took.
 *
 *   node scripts/restoreAll.mjs <dir> --confirm
 *   node scripts/restoreAll.mjs <dir> --confirm --only products,categories
 *   node scripts/restoreAll.mjs <dir> --confirm --replace
 *
 * Reads the Extended JSON written by the dump, so documents come back with the
 * same _id values they left with. That is the whole point: a restore that
 * assigns fresh ids looks correct collection by collection while every
 * reference between them — a product's category, an order's line items —
 * quietly points at nothing.
 *
 * By default a collection that already holds documents is skipped rather than
 * merged into, because a half-overlapping merge is harder to reason about than
 * either outcome. `--replace` empties it first.
 *
 * `--confirm` is required. This writes to whatever MONGO_URI names, and that
 * is usually production.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { readFile, readdir } from "node:fs/promises";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { EJSON } from "bson";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
const confirmed = args.includes("--confirm");
const replace = args.includes("--replace");
const onlyArg = args[args.indexOf("--only") + 1];
const only =
  args.includes("--only") && onlyArg && !onlyArg.startsWith("--")
    ? new Set(onlyArg.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

if (!dir) {
  console.error("usage: node scripts/restoreAll.mjs <dir> --confirm [--only a,b] [--replace]");
  process.exit(1);
}
if (!confirmed) {
  console.error(`Refusing to write without --confirm. Target: ${process.env.MONGO_URI?.replace(/\/\/[^@]*@/, "//<credentials>@")}`);
  process.exit(1);
}

const files = (await readdir(dir))
  .filter((f) => f.endsWith(".json") && f !== "_manifest.json")
  .sort();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

let restored = 0;
let skipped = 0;

for (const file of files) {
  const name = basename(file, ".json");
  if (only && !only.has(name)) continue;

  const docs = EJSON.parse(await readFile(join(dir, file), "utf8"));
  if (!docs.length) {
    console.log("     0", name, "(nothing in the dump)");
    continue;
  }

  const existing = await db.collection(name).countDocuments();
  if (existing && !replace) {
    console.log(String(existing).padStart(6), name, "— already has documents, skipped (use --replace)");
    skipped += 1;
    continue;
  }
  if (existing && replace) await db.collection(name).deleteMany({});

  // ordered:false so one rejected document does not abandon the rest of the
  // collection; the count printed is what actually landed.
  const res = await db.collection(name).insertMany(docs, { ordered: false });
  console.log(String(res.insertedCount).padStart(6), name);
  restored += res.insertedCount;
}

await mongoose.disconnect();
console.log(`\nrestored ${restored} documents` + (skipped ? `, skipped ${skipped} collection(s)` : ""));
