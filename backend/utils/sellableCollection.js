/**
 * Whether a bundle can still be sold.
 *
 * `populate` resolves a reference whose document has gone to `null`, and
 * nothing downstream expected that. Four seeded bundles were live in exactly
 * that state: every row rendered as "Product" with no name and no price, under
 * a bundle price of 11,500 to 135,000 EGP and a working Add Bundle button whose
 * handler read `product.stock` off the null and answered 500.
 *
 * Partly resolved counts as broken. The price is for the set, so a bundle
 * missing one of its three members is not a cheaper bundle — it is the wrong
 * price for a different thing.
 *
 * ## Why this lives here and not in the controller that first needed it
 *
 * It began as a private helper in collection.controller.js, which fixed
 * /api/collections and left /api/home-feed — a different controller with its
 * own query — still serving all four. So the home page went on showing the
 * broken bundles while "View All Bundles" led to a page that correctly showed
 * none, which is worse than either on its own: the shop disagreed with itself,
 * and the half that looked fine was the one that was wrong.
 *
 * Anything that puts a bundle in front of a customer asks this function.
 *
 * Works on lean objects as well as documents: it reads two plain fields and
 * calls nothing, which matters because the home feed is `.lean()`.
 */
export const isSellable = (collection) =>
  Array.isArray(collection?.items) &&
  collection.items.length > 0 &&
  collection.items.every((item) => item?.product);

export default isSellable;
