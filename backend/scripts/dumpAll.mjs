/**
 * Dump every collection in the database to Extended JSON, one file each.
 *
 *   node scripts/dumpAll.mjs <outDir>
 *
 * backupCatalog.mjs covers the catalogue and is the one to reach for before a
 * product import. This one takes everything, including users, roles and
 * settings, and exists because the dashboard can now empty a section on a
 * click — that button should never be the only copy of anything.
 *
 * Extended JSON (relaxed: false) so ObjectIds and Dates survive the round
 * trip as themselves. Plain JSON.stringify turns an ObjectId into a string,
 * and a restore from that would look right while silently breaking every
 * reference between collections.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { EJSON } from "bson";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: node scripts/dumpAll.mjs <outDir>");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
await mkdir(outDir, { recursive: true });

const names = (await db.listCollections().toArray()).map((c) => c.name).sort();
const manifest = { takenAt: new Date().toISOString(), collections: {} };

for (const name of names) {
  const docs = await db.collection(name).find({}).toArray();
  await writeFile(join(outDir, `${name}.json`), EJSON.stringify(docs, null, 0, { relaxed: false }));
  manifest.collections[name] = docs.length;
  console.log(String(docs.length).padStart(7), name);
}

await writeFile(join(outDir, "_manifest.json"), JSON.stringify(manifest, null, 2));
await mongoose.disconnect();
console.log("\nwritten to", outDir);
