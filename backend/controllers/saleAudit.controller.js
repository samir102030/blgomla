import Product from "../models/product.model.js";
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
