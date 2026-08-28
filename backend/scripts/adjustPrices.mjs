/**
 * Move prices by a percentage, and optionally put the stock back on the shelf.
 *
 *   node scripts/adjustPrices.mjs --percent 20 --dry
 *   node scripts/adjustPrices.mjs --percent 20 --confirm
 *   node scripts/adjustPrices.mjs --percent 12 --category "Smart Locks" --stock 10 --only-empty --dry
 *   node scripts/adjustPrices.mjs --restore <snapshot.json> --confirm
 *
 * `--category` narrows the run to one department and everything beneath it,
 * matched on slug or name. Without it the whole catalogue moves, which is the
 * original behaviour. The branch is walked to any depth, so naming a root
 * covers its children and their children.
 *
 * `--stock <n>` sets the stock of every product the run touches. It exists
 * because a department can go out of stock wholesale — every one of the 58
 * Smart Locks did — and repricing a shelf nobody can buy from is half a job.
 * Only products with a price are given stock: availability is read off `stock`
 * and never off `price`, so stocking an unpriced product would put it on sale
 * for nothing.
 *
 * `--only-empty` narrows that to the products currently at zero. Add it
 * whenever some of the department is genuinely counted: the whole point of
 * `--stock` was a shelf where every line read unavailable, and by the time
 * Smart Locks had grown to 85 products, 25 of them carried real figures that a
 * flat number would have erased. A stock count somebody keeps is not ours to
 * overwrite on the way past.
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
import Category from "../models/category.model.js";
import { ANY_AUDIENCE } from "../utils/electronicsVisibility.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const confirmed = args.includes("--confirm");
const percent = Number(args[args.indexOf("--percent") + 1]);
const restorePath = args.includes("--restore") ? args[args.indexOf("--restore") + 1] : null;
const categoryArg = args.includes("--category") ? args[args.indexOf("--category") + 1] : null;
const newStock = args.includes("--stock") ? Number(args[args.indexOf("--stock") + 1]) : null;
const onlyEmpty = args.includes("--only-empty");
const snapshotPath =
  args.includes("--snapshot")
    ? args[args.indexOf("--snapshot") + 1]
    : join(__dirname, `price-snapshot-${Date.now()}.json`);

if (!restorePath && !Number.isFinite(percent)) {
  console.error("usage: node scripts/adjustPrices.mjs --percent <n> [--category <name|slug>] [--stock <n> [--only-empty]] (--dry | --confirm)");
  process.exit(1);
}
if (newStock !== null && (!Number.isInteger(newStock) || newStock < 0)) {
  console.error("--stock takes a whole number of units, zero or more.");
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
  // Snapshots taken before --stock existed carry prices only, and still restore.
  const stockFor = new Map(saved.stocks || []);
  const ops = saved.prices.map(([id, price]) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(id) },
      update: {
        $set: { price, ...(stockFor.has(id) ? { stock: stockFor.get(id) } : {}) },
      },
    },
  }));
  const result = await Product.bulkWrite(ops, { ordered: false });
  console.log(
    `restored ${result.modifiedCount} products from ${restorePath}` +
      (stockFor.size ? ` (prices and stock)` : ` (prices)`)
  );
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

/*
  One department instead of the whole shop.

  Matched on slug first and then on name, because a slug is what a URL carries
  and a name is what a person types. The branch is walked to any depth: naming
  "Smart Locks" has to reach Hotel Lock Systems and Lock Accessories too, since
  those hang off the same root and a price list that skipped them would leave
  the department half raised.
*/
if (categoryArg) {
  const wanted = String(categoryArg).trim();
  const root = await Category.findOne({
    deleted: { $ne: true },
    $or: [
      { slug: wanted.toLowerCase() },
      { name: new RegExp(`^${wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    ],
  })
    .select("_id name")
    .lean();

  if (!root) {
    console.error(`No category matches "${categoryArg}".`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const all = await Category.find({ deleted: { $ne: true } })
    .select("_id parentCategory name")
    .lean();
  const childrenOf = new Map();
  for (const c of all) {
    const parent = c.parentCategory ? String(c.parentCategory) : null;
    if (!parent) continue;
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent).push(String(c._id));
  }
  const branch = (id) => [id, ...(childrenOf.get(id) || []).flatMap(branch)];
  const ids = branch(String(root._id));
  const nameOf = new Map(all.map((c) => [String(c._id), c.name]));

  SCOPE.category = { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) };
  console.log(`scope: ${root.name} — ${ids.length} categories`);
  console.log(`  ${ids.map((id) => nameOf.get(id) || "?").join(", ")}`);
}

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
  ? await (async () => {
      const saved = JSON.parse(await readFile(fromPath, "utf8"));
      // The old stock belongs to the re-applied run as much as the old price
      // does — without it a repeat would snapshot a stock of zero for every
      // product and hand --restore the wrong number to put back.
      const stockFor = new Map(saved.stocks || []);
      return saved.prices.map(([id, price]) => ({
        _id: new mongoose.Types.ObjectId(id),
        price,
        stock: stockFor.has(id) ? stockFor.get(id) : 0,
      }));
    })()
  : await Product.find({ ...SCOPE, price: { $gt: 0 } }).select("_id price stock").lean();
const factor = 1 + percent / 100;

console.log(`products with a price: ${products.length}`);
console.log(`factor: x${factor}`);
if (newStock !== null) {
  const out = products.filter((p) => !(Number(p.stock) > 0)).length;
  console.log(
    onlyEmpty
      ? `stock: ${out} at zero set to ${newStock}; the other ${products.length - out} keep the count they have`
      : `stock: every one of them set to ${newStock} (${out} are at zero today)`
  );
}

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
  JSON.stringify({
    takenAt: new Date().toISOString(),
    percent,
    ...(categoryArg ? { category: categoryArg } : {}),
    prices: products.map((p) => [String(p._id), p.price]),
    // Only when this run sets stock: a snapshot that did not touch stock must
    // not put an old figure back over whatever the shop has done since.
    ...(newStock !== null
      ? { stocks: products.map((p) => [String(p._id), Number(p.stock) || 0]) }
      : {}),
  }),
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
    updateOne: {
      filter: { _id: p._id },
      update: {
        $set: {
          price: roundPrice(p.price * factor),
          // A product that already has a count keeps it under --only-empty.
          // The snapshot still records its stock, so a restore puts back what
          // was there either way.
          ...(newStock !== null && (!onlyEmpty || !(Number(p.stock) > 0))
            ? { stock: newStock }
            : {}),
        },
      },
    },
  }));
  const result = await Product.bulkWrite(ops, { ordered: false });
  changed += result.modifiedCount;
  console.log(`  ${Math.min(i + CHUNK, products.length)}/${products.length}  changed ${changed}`);
}

console.log(
  newStock !== null ? `products changed: ${changed} (price and stock)` : `prices changed: ${changed}`
);

await mongoose.disconnect();
