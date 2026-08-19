/**
 * Dump the catalogue collections to JSON, so a delete is reversible.
 *
 *   node scripts/backupCatalog.mjs [outDir]
 *
 * The mongodb build installed here ships only the server binaries — no
 * mongodump — so this stands in for it. Raw documents straight off the driver,
 * ids and all, which is what makes the companion restore able to put the
 * catalogue back exactly as it was rather than as a lookalike with new ids that
 * every order and cart would have stopped pointing at.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const stamp = process.argv[3] || "manual";
const outDir =
  process.argv[2] || `C:\\Users\\Crafted\\belgomla-backup-${stamp}`;

const COLLECTIONS = [
  "products",
  "categories",
  "brands",
  "collections",
  "orders",
  "advertisements",
  "mosaiccards",
  "pagelayouts",
];

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
await mkdir(outDir, { recursive: true });

const manifest = {};
for (const name of COLLECTIONS) {
  const exists = await db.listCollections({ name }).hasNext();
  if (!exists) {
    console.log(`${name.padEnd(16)} — not present, skipped`);
    continue;
  }
  const docs = await db.collection(name).find({}).toArray();
  await writeFile(
    path.join(outDir, `${name}.json`),
    JSON.stringify(docs, null, 0),
    "utf8"
  );
  manifest[name] = docs.length;
  console.log(`${name.padEnd(16)} ${String(docs.length).padStart(6)} documents`);
}

await writeFile(
  path.join(outDir, "manifest.json"),
  JSON.stringify({ database: db.databaseName, counts: manifest }, null, 2),
  "utf8"
);

console.log(`\nWritten to ${outDir}`);
await mongoose.disconnect();
