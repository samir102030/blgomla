/**
 * Write down the deliveries that happened before anything was writing them.
 *
 * `status: "delivered"` and `isDelivered: true` are the same fact recorded
 * twice, and until commit a9f6611 only the first was ever written: the admin
 * dashboard set the status and nothing set the flags. Everything that counts
 * money reads the flags — vendor payouts filter on `isDelivered && isPaid`, a
 * store's revenue on `isPaid`, the review-request cron on `isDelivered` — so
 * every order delivered before that commit is still invisible to all three.
 *
 * The fix only applies from now on. This is for the ones already in the book.
 *
 * ## What it does
 *
 * For each order at status "delivered" with `isDelivered` still false:
 *
 *   - `isDelivered: true`
 *   - `deliveredAt`: the timeline entry that recorded the delivery, if there
 *     is one, else the order's `updatedAt`. Never `now` — the review cron
 *     looks for orders delivered three days ago and the returns window counts
 *     from this date, so stamping today would restart both clocks on orders
 *     that arrived months back.
 *   - for cash on delivery that is not already paid: `isPaid`, `paidAt` to
 *     match, because that is when the money changed hands. An online order is
 *     left exactly as it is — if its gateway never confirmed, it was never
 *     paid, and that is the truth about it.
 *
 * Orders that disagree the other way — `isDelivered: true` at a status that is
 * not "delivered" — are reported and not touched. That combination cannot
 * arise any more, but if one exists it is a story this script should not
 * guess at.
 *
 * ## Running it
 *
 *   node scripts/backfillDelivery.mjs           # report only, changes nothing
 *   node scripts/backfillDelivery.mjs --apply   # write
 *
 * Reads MONGO_URI from the environment, same as the server.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/order.model.js";

dotenv.config();

const APPLY = process.argv.includes("--apply");

const deliveredAtFrom = (order) => {
  const entry = [...(order.statusTimeline || [])]
    .reverse()
    .find((e) => e?.status === "delivered" && e?.createdAt);
  return entry?.createdAt || order.updatedAt || order.createdAt || new Date();
};

const main = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not set. Nothing to connect to.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`connected · ${APPLY ? "APPLY" : "dry run — nothing will be written"}\n`);

  /*
    Two ways an old delivered order can be short of what it should hold: the
    flag was never written at all, or it was written without settling the cash
    the courier collected. Both are the same omission from different eras, and
    both are invisible to payouts and to the store's revenue, so both are
    caught here.
  */
  const behind = await Order.find({
    status: "delivered",
    $or: [
      { isDelivered: { $ne: true } },
      { paymentMethod: "cod", isPaid: { $ne: true } },
    ],
  })
    .select("_id status isDelivered deliveredAt isPaid paidAt paymentMethod paymentResult statusTimeline createdAt updatedAt")
    .lean();

  const ahead = await Order.countDocuments({
    isDelivered: true,
    status: { $ne: "delivered" },
  });

  console.log(`delivered but incomplete  : ${behind.length}`);
  console.log(`flagged but not delivered : ${ahead}${ahead ? "  (reported only, not touched)" : ""}\n`);

  if (!behind.length) {
    console.log("nothing to do.");
    await mongoose.disconnect();
    return;
  }

  let paidToo = 0;
  for (const order of behind) {
    // An order that already has a delivery date keeps it. Only the ones with
    // nothing recorded get one worked out from the timeline.
    const when = order.isDelivered && order.deliveredAt
      ? new Date(order.deliveredAt)
      : deliveredAtFrom(order);

    const set = {};
    if (!order.isDelivered) {
      set.isDelivered = true;
      set.deliveredAt = when;
    }
    const collectOnDelivery = order.paymentMethod === "cod" && !order.isPaid;
    if (collectOnDelivery) {
      set.isPaid = true;
      set.paidAt = when;
      paidToo += 1;
    }
    if (!Object.keys(set).length) continue;

    console.log(
      `${String(order._id).slice(-8).toUpperCase()}  ` +
        `${when.toISOString().slice(0, 10)}  ` +
        `${order.paymentMethod}  ${Object.keys(set).join(" ")}`
    );

    if (APPLY) await Order.updateOne({ _id: order._id }, { $set: set });
  }

  console.log(
    `\n${APPLY ? "written" : "would write"}: ${behind.length} order(s)` +
      `, of which ${paidToo} settled as paid (cash on delivery).`
  );
  if (!APPLY) console.log("re-run with --apply to write.");

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
