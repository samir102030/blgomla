/**
 * Move every price by a percentage.
 *
 *   node scripts/adjustPrices.mjs --percent 20 --dry
 *   node scripts/adjustPrices.mjs --percent 20 --confirm
 *   node scripts/adjustPrices.mjs --restore <snapshot.json> --confirm
 *
 * `price` is the only stored money on a product: the sale price is a virtual
 * computed from `salePercentage`, so a product on sale follows the new price by
 * itself and needs nothing done to it. There is no cost price, no bulk tier and
 * no variant override in this catalogue — if any of those ever appear, they
 * belong in here too or a markup will only move half the shop.
 *
 * Every run writes a snapshot of the old prices before it changes anything, and
 * `--restore` puts them back exactly. A percentage is easy to apply twice by
 * accident and impossible to undo by applying the inverse — down 20% does not
 * cancel up 20%.
 *
 * Prices round to the nearest pound. Anything more opinionated — round numbers,
 * .99 endings — is a pricing decision rather than an arithmetic one.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { writeFile, readFile } from "node:fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Product from "../models/product.model.js";
import { ANY_AUDIENCE } from "../utils/electronicsVisibility.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const confirmed = args.includes("--confirm");
const percent = Number(args[args.indexOf("--percent") + 1]);
const restorePath = args.includes("--restore") ? args[args.indexOf("--restore") + 1] : null;
const snapshotPath =
  args.includes("--snapshot")
    ? args[args.indexOf("--snapshot") + 1]
    : join(__dirname, `price-snapshot-${Date.now()}.json`);

if (!restorePath && !Number.isFinite(percent)) {
  console.error("usage: node scripts/adjustPrices.mjs --percent <n> (--dry | --confirm)");
  process.exit(1);
}
if (!dry && !confirmed) {
  console.error("Refusing to write without --confirm.");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 60_000,
  socketTimeoutMS: 120_000,
});

if (restorePath) {
  const saved = JSON.parse(await readFile(restorePath, "utf8"));
  const ops = saved.prices.map(([id, price]) => ({
    updateOne: { filter: { _id: new mongoose.Types.ObjectId(id) }, update: { $set: { price } } },
  }));
  const result = await Product.bulkWrite(ops, { ordered: false });
  console.log(`restored ${result.modifiedCount} prices from ${restorePath}`);
  await mongoose.disconnect();
  process.exit(0);
}

// Every section of the shop, said out loud.
//
// The model hides the electronics branch from any query that does not mention
// `audience`, which is right for a storefront listing and wrong for a script
// that is meant to reprice the catalogue: without this it silently covered
// 6,031 products out of 11,686 and reported success.
const SCOPE = { audience: ANY_AUDIENCE };

// `--from` re-applies an earlier run: same original prices, same result, no
// matter how far the interrupted attempt got.
const fromPath = args.includes("--from") ? args[args.indexOf("--from") + 1] : null;
/**
 * Rounding that does not erase the cheap things.
 *
 * Whole pounds everywhere looked tidy until it met the 324 components priced
 * at a quarter of a pound: 0.25 x 1.2 is 0.30, and rounding that to the nearest
 * pound is zero. A resistor is not free.
 *
 * So anything that lands under a pound keeps its piastres, and everything else
 * rounds to the pound, which is how prices are written here.
 */
const roundPrice = (value) => (value < 1 ? Math.round(value * 100) / 100 : Math.round(value));

const products = fromPath
  ? JSON.parse(await readFile(fromPath, "utf8")).prices.map(([id, price]) => ({
      _id: new mongoose.Types.ObjectId(id),
      price,
    }))
  : await Product.find({ ...SCOPE, price: { $gt: 0 } }).select("_id price").lean();
const factor = 1 + percent / 100;

console.log(`products with a price: ${products.length}`);
console.log(`factor: x${factor}`);

const sample = products.slice(0, 5).map((p) => `${p.price} -> ${roundPrice(p.price * factor)}`);
console.log("sample:", sample.join(", "));

if (dry) {
  const skipped = await Product.countDocuments({ ...SCOPE, $or: [{ price: 0 }, { price: null }] });
  console.log(`untouched (no price): ${skipped}`);
  console.log("\n(dry run — nothing written)");
  await mongoose.disconnect();
  process.exit(0);
}

await writeFile(
  snapshotPath,
  JSON.stringify({ takenAt: new Date().toISOString(), percent, prices: products.map((p) => [String(p._id), p.price]) }),
);
console.log(`snapshot: ${snapshotPath}`);

// Applied in chunks, and every target is computed from the snapshot rather
// than from the price in the database.
//
// A percentage applied to a moving number is not repeatable: if the link drops
// half way, the products already done have the new price, and running the same
// command again would raise those a second time. Reading the old price from the
// snapshot makes a re-run land on exactly the same numbers, however many times
// it is interrupted.
const CHUNK = 500;
let changed = 0;

for (let i = 0; i < products.length; i += CHUNK) {
  const slice = products.slice(i, i + CHUNK);
  const ops = slice.map((p) => ({
    updateOne: { filter: { _id: p._id }, update: { $set: { price: roundPrice(p.price * factor) } } },
  }));
  const result = await Product.bulkWrite(ops, { ordered: false });
  changed += result.modifiedCount;
  console.log(`  ${Math.min(i + CHUNK, products.length)}/${products.length}  changed ${changed}`);
}

console.log(`prices changed: ${changed}`);

await mongoose.disconnect();
