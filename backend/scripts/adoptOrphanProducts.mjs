/**
 * Give every unowned product to the shop's own store.
 *
 *   node scripts/adoptOrphanProducts.mjs --dry
 *   node scripts/adoptOrphanProducts.mjs --confirm
 *
 * `Order.store` is required and checkout refuses to submit without one, but
 * `Product.store` is not and nothing filled it in: every path that created a
 * product set the store only when a vendor was creating it. An administrator
 * importing the catalogue is not a vendor, so all of it arrived unowned and
 * every attempt to buy any of it died on "Unable to determine the store for
 * your order".
 *
 * The code now defaults the store on the way in. This is for what came before.
 *
 * Also repairs the store's owner if it points at a user that no longer exists
 * — the data wipe took the original with it, and an ownerless store means the
 * new-order notification silently goes nowhere.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const args = process.argv.slice(2);
const confirmed = args.includes("--confirm");

if (!confirmed && !args.includes("--dry")) {
  console.error("usage: node scripts/adoptOrphanProducts.mjs (--dry | --confirm)");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);

const Products = mongoose.connection.collection("products");
const Stores = mongoose.connection.collection("stores");
const Users = mongoose.connection.collection("users");

const ORPHAN = { $or: [{ store: null }, { store: { $exists: false } }] };

const store = await Stores.findOne({ deleted: { $ne: true } }, { sort: { createdAt: 1 } });
if (!store) {
  console.error("no store to adopt into — create one first");
  await mongoose.disconnect();
  process.exit(1);
}

const superAdmin = await Users.findOne({ role: "super_admin" }, { projection: { email: 1 } });
const ownerAlive = store.owner ? await Users.findOne({ _id: store.owner }) : null;

const orphans = await Products.countDocuments(ORPHAN);
const total = await Products.countDocuments();

console.log("store        :", store.name, `(${store._id})`);
console.log("owner        :", ownerAlive ? "present" : "MISSING — points at a deleted user");
if (!ownerAlive && superAdmin) console.log("  would set to:", superAdmin.email);
console.log("products     :", total);
console.log("unowned      :", orphans);

if (!confirmed) {
  console.log("\ndry run — nothing written. Re-run with --confirm.");
  await mongoose.disconnect();
  process.exit(0);
}

if (!ownerAlive && superAdmin) {
  await Stores.updateOne({ _id: store._id }, { $set: { owner: superAdmin._id } });
  console.log("\nowner repaired:", superAdmin.email);
}

const res = await Products.updateMany(ORPHAN, { $set: { store: store._id } });
console.log("adopted      :", res.modifiedCount);
console.log("still unowned:", await Products.countDocuments(ORPHAN));

await mongoose.disconnect();
