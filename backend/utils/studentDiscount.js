import StudentProfile from "../models/studentProfile.model.js";
import StudentProgram from "../models/studentProgram.model.js";

/**
 * The standing student discount.
 *
 * The programme already paid its members in a personal coupon, and a coupon is
 * a thing you have to remember, find and type. A member who signed in and put
 * three boards in a basket saw the ordinary price and no hint that a code
 * existed, so the discount the shop was advertising was, at the till, off.
 *
 * So it is applied because of who is buying, not because of what they typed.
 * The terms are still the ones on the Student discount page — rate, cap,
 * minimum — read live, so changing them there changes what the next order
 * charges, and turning the programme off turns this off with it.
 *
 * Two boundaries worth keeping:
 *
 * 1. It covers the student section and nothing else. `audience` is the same
 *    line the STU coupon drew, and it is the line the shop asked for: the
 *    section has its own shelf and its own prices, and a member filling a
 *    basket with ordinary stock is an ordinary customer for that stock.
 *
 * 2. A typed coupon replaces it rather than stacking on it. Two discounts on
 *    one invoice is a number nobody budgeted for, and the caller decides which
 *    one applies by simply not asking for this when a coupon was accepted.
 *
 * The coupon is left exactly as it is: still minted, still personal, still
 * counted. It is what an admin looks at to see the membership, and it stays
 * usable for anything this does not cover.
 */

/** The section this discount is good for. Same value `Product.audience` uses. */
export const STUDENT_AUDIENCE = "electronics";

/**
 * The live terms for one buyer, or null when nothing should come off.
 *
 * Null covers every "no" in one shape — programme switched off, rate set to
 * zero, no application, unverified, expired — because the caller does the same
 * thing for all of them, and a caller that had to tell them apart would end up
 * deciding membership questions in the middle of a checkout.
 */
export const studentTermsFor = async (userId, { session } = {}) => {
  if (!userId) return null;

  const program = await StudentProgram.load();
  if (!program?.enabled) return null;

  const d = program.discount || {};
  const value = Number(d.value);
  if (!Number.isFinite(value) || value <= 0) return null;

  const query = StudentProfile.findOne({ user: userId });
  if (session) query.session(session);
  const profile = await query;
  // `isActive` is the model's own answer to "verified, and not run out".
  if (!profile?.isActive) return null;

  const cap = Number(d.maximumDiscount);
  return {
    type: d.type === "fixed" ? "fixed" : "percentage",
    value,
    maximumDiscount: Number.isFinite(cap) && cap > 0 ? cap : null,
    minimumPurchase: Math.max(0, Number(d.minimumPurchase) || 0),
  };
};

/**
 * What the terms take off a subtotal.
 *
 * `subtotal` is the eligible goods only. `orderSubtotal` is the whole goods
 * total the minimum is measured against — the same reading the STU coupon has
 * always had, where "on orders over 500" means the order, not the part of it
 * the code happens to cover. Pass one argument and the two are the same thing.
 */
export const studentDiscountOn = (subtotal, terms, orderSubtotal = subtotal) => {
  if (!terms || !(subtotal > 0)) return 0;
  if (orderSubtotal < terms.minimumPurchase) return 0;

  let off =
    terms.type === "fixed"
      ? Math.min(terms.value, subtotal)
      : subtotal * (terms.value / 100);

  if (terms.maximumDiscount) off = Math.min(off, terms.maximumDiscount);
  // Never more than the goods it is discounting, whatever the settings say.
  return Math.max(0, Math.min(off, subtotal));
};

/**
 * Split a discount across the lines that earned it, largest line first in
 * proportion to its share, with the rounding remainder landing on the last one
 * so the parts add up to the whole.
 *
 * Returned as a map keyed by the line's index in `lines`, so the caller can
 * write it onto whatever shape it is carrying.
 */
export const allocateAcross = (lines, discount) => {
  const shares = new Map();
  if (!(discount > 0) || !lines.length) return shares;

  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  if (!(total > 0)) return shares;

  let remaining = discount;
  lines.forEach((line, i) => {
    const last = i === lines.length - 1;
    const share = last
      ? Math.max(0, Math.min(remaining, line.amount))
      : Math.min(discount * (line.amount / total), line.amount, remaining);
    shares.set(line.index, share);
    remaining -= share;
  });
  return shares;
};
