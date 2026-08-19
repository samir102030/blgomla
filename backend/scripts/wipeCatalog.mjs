/**
 * Empty the catalogue: products, categories, brands.
 *
 *   node scripts/wipeCatalog.mjs                    # report only
 *   node scripts/wipeCatalog.mjs --yes-delete-all   # do it
 *
 * A hard delete, not the `deleted: true` flag the app uses elsewhere — the
 * point here is to start the catalogue from nothing.
 *
 * The confirmation flag is spelled out rather than `--force` so it cannot be
 * reached by autocompleting a shorter command, and the script refuses to run
 * unless a backup directory is named, because the only safe version of this
 * operation is the one you can undo:
 *
 *   node scripts/backupCatalog.mjs C:\path\to\backup
 *   node scripts/wipeCatalog.mjs --backup C:\path\to\backup --yes-delete-all
 *   node scripts/restoreCatalog.mjs C:\path\to\backup --apply --replace
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const args = process.argv.slice(2);
const confirmed = args.includes("--yes-delete-all");
const backupDir = args[args.indexOf("--backup") + 1];

// Which collections to empty. Defaults to the whole catalogue; `--collections
// products,categories` narrows it, because "clear the catalogue" and "clear the
// products" are different jobs and the second should not quietly do the first.
const DEFAULT_TARGETS = ["products", "categories", "brands"];
const TARGETS = args.includes("--collections")
  ? args[args.indexOf("--collections") + 1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : DEFAULT_TARGETS;

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

console.log(`database: ${db.databaseName}`);
console.log(confirmed ? "DELETING\n" : "DRY RUN — nothing will be deleted\n");

// Verify the backup covers what is about to go, before anything goes.
if (!backupDir) {
  console.error("Refusing to run: pass --backup <dir> naming a backupCatalog.mjs output.");
  await mongoose.disconnect();
  process.exit(1);
}
let manifest;
try {
  manifest = JSON.parse(await readFile(path.join(backupDir, "manifest.json"), "utf8"));
} catch {
  console.error(`Refusing to run: no manifest.json in ${backupDir}.`);
  await mongoose.disconnect();
  process.exit(1);
}

let blocked = false;
for (const name of TARGETS) {
  const live = await db.collection(name).countDocuments();
  const saved = manifest.counts?.[name] ?? 0;
  const ok = saved >= live;
  console.log(
    `${name.padEnd(12)} live ${String(live).padStart(6)}   backed up ${String(saved).padStart(6)}   ${ok ? "ok" : "MISMATCH"}`
  );
  if (!ok) blocked = true;
}

if (blocked) {
  console.error("\nRefusing to run: the backup is missing documents that are live now.");
  console.error("Re-run scripts/backupCatalog.mjs first.");
  await mongoose.disconnect();
  process.exit(1);
}

// Anything a customer has bought points into this data; say so rather than
// discover it afterwards.
const orders = await db.collection("orders").countDocuments();
if (orders > 0) {
  console.log(`\n⚠️  ${orders} orders reference these products and will be left dangling.`);
}

if (!confirmed) {
  console.log(`\nBackup verified at ${backupDir}.`);
  console.log("Run again with --yes-delete-all to delete.");
  await mongoose.disconnect();
  process.exit(0);
}

for (const name of TARGETS) {
  const { deletedCount } = await db.collection(name).deleteMany({});
  console.log(`${name.padEnd(12)} deleted ${deletedCount}`);
}

console.log(`\nDone. Restore with:`);
console.log(`  node scripts/restoreCatalog.mjs "${backupDir}" --apply --replace`);
await mongoose.disconnect();
