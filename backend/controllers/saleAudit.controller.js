import Product from "../models/product.model.js";
import SaleSnapshot from "../models/saleSnapshot.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { logAudit } from "../utils/audit.js";
import { ANY_AUDIENCE } from "../utils/electronicsVisibility.js";

/**
 * What the shop is currently discounting, and a way to stop.
 *
 * Measured on the live catalogue: 860 products carry an active discount, and
 * the percentages are spread almost evenly across every integer from 1 to 100 —
 * six products at 1%, twenty at 2%, and so on to three at 99% and one at 100%,
 * which is free. No shop prices like that. It is seeded noise, and the order
 * endpoint charges it: an APC Back UPS listed at 1,199 sells for 24, a
 * Ultracell battery at 1,199 sells for 24, and 393 products are at half price
 * or better, giving away EGP 1.85M of a EGP 12.8M list.
 *
 * This does not decide anything. Pricing is the shop's call and the shop cannot
 * make it without seeing the numbers, which live nowhere it can look: the
 * dashboard's Sales page is analytics over orders, and nothing lists what is
 * discounted. So the audit reports, and clearing is a separate, deliberate act.
 *
 * Clearing switches `saleActive` off and leaves `salePercentage` exactly where
 * it is. Nothing is erased — a real campaign that was cleared by mistake is one
 * flag away from coming back, and the percentages are the only record of what
 * was intended.
 */

const liveSale = {
  audience: ANY_AUDIENCE,
  deleted: { $ne: true },
  saleActive: true,
  salePercentage: { $gt: 0 },
};

/** Reads only. */
export const getSaleAudit = controllerWrapper("getSaleAudit", async (req, res) => {
  const rows = await Product.find(liveSale)
    .select("_id name price salePercentage")
    .lean();

  const listValue = rows.reduce((sum, p) => sum + (p.price || 0), 0);
  const discount = rows.reduce(
    (sum, p) => sum + ((p.price || 0) * (p.salePercentage || 0)) / 100,
    0
  );

  // Bands rather than every integer: the shape is the point, and one hundred
  // buckets of single digits is a table nobody reads.
  const bands = { "1-9": 0, "10-24": 0, "25-49": 0, "50-74": 0, "75-100": 0 };
  for (const p of rows) {
    const v = p.salePercentage;
    if (v < 10) bands["1-9"] += 1;
    else if (v < 25) bands["10-24"] += 1;
    else if (v < 50) bands["25-49"] += 1;
    else if (v < 75) bands["50-74"] += 1;
    else bands["75-100"] += 1;
  }

  const deepest = [...rows]
    .sort((a, b) => b.salePercentage - a.salePercentage)
    .slice(0, 10)
    .map((p) => ({
      _id: p._id,
      name: p.name,
      price: p.price,
      salePercentage: p.salePercentage,
      sellsFor: Math.round((p.price || 0) * (1 - (p.salePercentage || 0) / 100)),
    }));

  res.status(200).json({
    success: true,
    onSale: rows.length,
    listValue: Math.round(listValue),
    discount: Math.round(discount),
    halfOrMore: rows.filter((p) => p.salePercentage >= 50).length,
    bands,
    deepest,
  });
});

/**
 * Switch the discounts off.
 *
 * `minPercentage` narrows it, so the deepest ones can go without touching a
 * genuine 10%-off campaign that might be running alongside them.
 */
export const clearSales = controllerWrapper("clearSales", async (req, res) => {
  const min = Math.min(Math.max(Number(req.body?.minPercentage) || 0, 0), 100);
  const filter = min > 0 ? { ...liveSale, salePercentage: { $gte: min } } : liveSale;

  const affected = await Product.countDocuments(filter);
  const result = await Product.updateMany(filter, { $set: { saleActive: false } });

  await logAudit(req, "product.sales.cleared", "product", null, {
    minPercentage: min,
    matched: affected,
    modified: result.modifiedCount,
  });

  res.status(200).json({
    success: true,
    cleared: result.modifiedCount,
    // Said plainly, because it is what makes this safe to press.
    note: "salePercentage was left as it was; only saleActive changed.",
  });
});

/**
 * Put a ceiling on the discounts instead of switching them off.
 *
 * Clearing is the blunt answer: everything stops, including whatever was
 * deliberate. A cap is the other one — a shop that is willing to discount, but
 * not to give a EGP 1,199 battery away for 24, says so as a number. Everything
 * above the line comes down to the line; everything at or below it is left
 * exactly as it was, because those are the ones that look like real pricing.
 *
 * The filter deliberately does not mention `saleActive`. A percentage sitting
 * on a switched-off product is not harmless: it is a loaded gun, and the moment
 * anybody toggles the sale back on the shop is charging 90% off again. The
 * numbers are what get capped, so every number gets capped.
 *
 * This one does erase something, which clearing did not — so, like the price
 * raise, it writes down what it is about to overwrite before it overwrites it.
 */
export const capSales = controllerWrapper("capSales", async (req, res) => {
  const cap = Number(req.body?.maxPercentage);
  if (!Number.isFinite(cap) || cap < 1 || cap > 100) {
    return res.status(400).json({
      success: false,
      message: "Give a ceiling between 1 and 100.",
    });
  }

  // Only what is above the line. Products already at or under it are not
  // touched, so this is safe to press twice.
  const filter = {
    audience: ANY_AUDIENCE,
    deleted: { $ne: true },
    salePercentage: { $gt: cap },
  };

  const rows = await Product.find(filter).select("_id salePercentage").lean();
  if (!rows.length) {
    // No snapshot for a run that changes nothing: an empty one would become the
    // newest un-undone snapshot and quietly swallow the undo of a real run.
    return res.status(200).json({ success: true, capped: 0, cap });
  }

  // Written first, and awaited, so a run that dies half way through still has
  // its before-image on disk. A snapshot saved afterwards would be missing for
  // exactly the run that needed it.
  const snapshot = await SaleSnapshot.create({
    cap,
    entries: rows.map((p) => ({ product: p._id, was: p.salePercentage })),
    byName: req.user?.name || req.user?.email,
  });

  const result = await Product.updateMany(filter, { $set: { salePercentage: cap } });

  await logAudit(req, "product.sales.capped", "product", null, {
    cap,
    matched: rows.length,
    modified: result.modifiedCount,
    snapshot: String(snapshot._id),
  });

  res.status(200).json({
    success: true,
    capped: result.modifiedCount,
    cap,
    // Said plainly, because it is what makes this safe to press.
    note: `Discounts above ${cap}% were lowered to ${cap}%; the rest were left alone, and saleActive did not change.`,
  });
});

/**
 * Put the last cap back, from the numbers it wrote down.
 *
 * It restores what the run overwrote, so a percentage somebody edited by hand
 * in the meantime goes back to its pre-cap value too. That is the same bargain
 * the price undo makes, and the reason the button is offered for the newest
 * run only.
 */
export const undoCapSales = controllerWrapper("undoCapSales", async (req, res) => {
  const snapshot = await SaleSnapshot.findOne({ undoneAt: { $exists: false } }).sort({
    createdAt: -1,
  });
  if (!snapshot) {
    return res.status(404).json({ success: false, message: "Nothing to undo." });
  }

  const result = await Product.bulkWrite(
    snapshot.entries.map((e) => ({
      updateOne: {
        filter: { _id: e.product },
        update: { $set: { salePercentage: e.was } },
      },
    })),
    { ordered: false }
  );

  snapshot.undoneAt = new Date();
  await snapshot.save();

  await logAudit(req, "product.sales.cap_undone", "product", null, {
    cap: snapshot.cap,
    restored: result.modifiedCount,
    snapshot: String(snapshot._id),
  });

  res.status(200).json({
    success: true,
    restored: result.modifiedCount,
    cap: snapshot.cap,
  });
});
