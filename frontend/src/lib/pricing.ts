import type { BulkPricingRule, Product } from "../types/product.type";

type PriceInput = Pick<Product, "price" | "saleActive" | "salePercentage">;
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
