/**
 * Give existing order notifications a link, and a readable order number.
 *
 *   node scripts/backfillNotificationLinks.mjs --dry
 *   node scripts/backfillNotificationLinks.mjs --confirm
 *
 * Notifications had nowhere to point until `link` was added, and the order ones
 * printed the full 24-character ObjectId in the middle of the sentence. Both
 * are recoverable from the message itself: the id is in it.
 *
 * Which link depends on who is reading. A customer's copy goes to the order in
 * their account; the store's "New Order Received" goes to the dashboard queue,
 * because the customer's account page is not theirs to open.
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
  console.error("usage: node scripts/backfillNotificationLinks.mjs (--dry | --confirm)");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
const Notifications = mongoose.connection.collection("notifications");

const OBJECT_ID = /#([0-9a-f]{24})\b/i;
const short = (id) => String(id).slice(-8).toUpperCase();

const candidates = await Notifications.find({
  $or: [{ link: { $exists: false } }, { link: null }, { link: "" }],
}).toArray();

let planned = 0;
for (const n of candidates) {
  const match = OBJECT_ID.exec(n.message || "");
  if (!match) continue;

  const orderId = match[1];
  // The store's copy names somebody else's order; it belongs in the dashboard.
  const forStaff = /new order received/i.test(n.title || "");
  const link = forStaff ? "/dashboard/order" : `/account?tab=orders&order=${orderId}`;
  const message = n.message.replace(OBJECT_ID, `#${short(orderId)}`);

  planned += 1;
  console.log(`  "${n.title}"`);
  console.log(`     ${n.message}`);
  console.log(`  -> ${message}`);
  console.log(`  -> ${link}`);

  if (confirmed) await Notifications.updateOne({ _id: n._id }, { $set: { link, message } });
}

console.log(`\nnotifications without a link : ${candidates.length}`);
console.log(`ones naming an order         : ${planned}`);
console.log(confirmed ? "written." : "dry run — nothing written. Re-run with --confirm.");

await mongoose.disconnect();
