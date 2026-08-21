import type { BulkPricingRule, Product } from "../types/product.type";

type PriceInput = Pick<Product, "price" | "saleActive"> & {
  salePercentage?: number;
};
type BulkInput = PriceInput & Pick<Product, "bulkPricing">;

const sortBulkPricing = (rules?: BulkPricingRule[]) => {
  if (!Array.isArray(rules)) return [];
  return rules
    .filter(
      (rule) =>
        Number.isFinite(rule.minQty) &&
        Number.isFinite(rule.unitPrice) &&
        rule.minQty >= 1 &&
        rule.unitPrice > 0
    )
    .sort((a, b) => a.minQty - b.minQty);
};

export const getBaseUnitPrice = (product: PriceInput & { salePrice?: number }) => {
  if (!product.saleActive) return product.price;
  if (typeof product.salePrice === "number" && product.salePrice > 0) {
    return product.salePrice;
  }
  if (typeof product.salePercentage === "number" && product.salePercentage > 0) {
    return product.price * (1 - product.salePercentage / 100);
  }
  return product.price;
};

export const getBulkPricing = (product: BulkInput, quantity: number) => {
  const baseUnitPrice = getBaseUnitPrice(product);
  const rules = sortBulkPricing(product.bulkPricing);
  const applicable = rules
    .filter((rule) => rule.minQty <= quantity)
    .sort((a, b) => b.minQty - a.minQty)[0];
  const unitPrice = applicable
    ? Math.min(baseUnitPrice, applicable.unitPrice)
    : baseUnitPrice;

  return {
    unitPrice,
    baseUnitPrice,
    applicableRule: applicable,
    rules,
  };
};

/**
 * Is this product quoted rather than priced?
 *
 * Some of the catalogue is agreed per order — the enterprise storage, the
 * high-end laptops — and those arrive with a price of zero, because that is
 * what "not set" looks like in a Number field. Treating zero as a price would
 * put "0 EGP" on the card and a buy button under it.
 *
 * Derived rather than flagged, so a product stops being quote-only the moment
 * somebody types a price into it, with nothing else to remember.
 */
export const isQuoteOnly = (product: PriceInput & { salePrice?: number }) =>
  !(getBaseUnitPrice(product) > 0);
