/**
 * Put a catalogue backup back.
 *
 *   node scripts/restoreCatalog.mjs <backupDir>            # report what it would do
 *   node scripts/restoreCatalog.mjs <backupDir> --apply    # write
 *
 * Companion to backupCatalog.mjs. Documents go back with their original `_id`,
 * which is the whole point: a restore that inserted fresh ids would leave every
 * order, cart and layout still pointing at documents that no longer exist.
 *
 * Refuses to write into a collection that already has documents unless
 * `--replace` is given, so an accidental run cannot merge an old catalogue into
 * a live one and leave a mess that looks like data corruption.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const backupDir = process.argv[2];
const apply = process.argv.includes("--apply");
const replace = process.argv.includes("--replace");

if (!backupDir) {
  console.error("Usage: node scripts/restoreCatalog.mjs <backupDir> [--apply] [--replace]");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const files = (await readdir(backupDir)).filter(
  (f) => f.endsWith(".json") && f !== "manifest.json"
);

console.log(apply ? "APPLYING\n" : "DRY RUN — nothing will be written\n");

// The driver needs real ObjectIds and Dates back; JSON gave us strings.
const revive = (value) => {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === "object") {
    if (value.$oid) return new mongoose.Types.ObjectId(value.$oid);
    if (value.$date) return new Date(value.$date);
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = revive(v);
    return out;
  }
  return value;
};

for (const file of files) {
  const name = path.basename(file, ".json");
  const docs = revive(JSON.parse(await readFile(path.join(backupDir, file), "utf8")));
  const existing = await db.collection(name).countDocuments();

  if (existing > 0 && !replace) {
    console.log(`${name.padEnd(16)} SKIPPED — holds ${existing} documents (pass --replace)`);
    continue;
  }
  console.log(
    `${name.padEnd(16)} ${String(docs.length).padStart(6)} documents` +
      (existing ? `  (replacing ${existing})` : "")
  );

  if (apply) {
    if (existing > 0) await db.collection(name).deleteMany({});
    if (docs.length) await db.collection(name).insertMany(docs, { ordered: false });
  }
}

console.log(apply ? "\nRestored." : "\nRun again with --apply to write.");
await mongoose.disconnect();
