/**
 * One place for collection/quote arithmetic.
 *
 * Three call sites need these numbers and have to agree exactly: the admin
 * editor validating a bundle price, the storefront showing a total, and order
 * creation allocating that total back across the lines. They used to each
 * compute the sum inline, which was survivable while a line's price was always
 * the product's price. Per-line overrides break that — a line can now say a
 * price the product doesn't — so the "what does this line cost" decision lives
 * here and nowhere else.
 */

/** A product's own price, honouring an active sale. */
export const productUnitPrice = (product) => {
  if (!product) return 0;
  return product.saleActive
    ? product.price * (1 - product.salePercentage / 100)
    : product.price;
};

/**
 * What one unit of a collection line costs.
 *
 * An override wins over the catalogue, including an override of 0 — a line
 * deliberately quoted as free is a real thing (a bundled cable, a spare), so
 * this tests for null/undefined rather than falsiness.
 */
export const lineUnitPrice = (item, product) => {
  if (item?.unitPrice !== null && item?.unitPrice !== undefined) {
    return Number(item.unitPrice);
  }
  return productUnitPrice(product ?? item?.product);
};

/**
 * Sum of every line at its effective price — the "before bundle discount"
 * figure. `products` is optional; pass it when the items aren't populated.
 */
export const collectionItemsTotal = (items = [], products = null) => {
  const byId = products
    ? new Map(products.map((p) => [String(p._id), p]))
    : null;
  return items.reduce((sum, item) => {
    const product = byId
      ? byId.get(String(item.product?._id ?? item.product))
      : item.product;
    return sum + lineUnitPrice(item, product) * item.quantity;
  }, 0);
};

/**
 * Installation charge for `quantity` units.
 *
 * Takes anything carrying an `installation` block — a Collection or a Product,
 * which is why the parameter isn't named for either.
 *
 * Charged per unit, not per order: two full setups is twice the fitting work.
 * Returns 0 unless the seller offers it and the buyer asked — the client's
 * flag can only say whether, never how much, because the price is read here.
 */
export const installationFee = (offeredBy, wantsInstallation, quantity = 1) => {
  if (!wantsInstallation) return 0;
  if (!offeredBy?.installation?.offered) return 0;
  return (offeredBy.installation.price || 0) * quantity;
};
