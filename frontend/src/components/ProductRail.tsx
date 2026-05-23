import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ProductCard from "./ProductCard";
import { getBaseUnitPrice } from "../lib/pricing";
import { axiosInstance } from "../lib/axios";
import type { Product } from "../types/product.type";

interface ProductRailProps {
  title: string;
  subtitle?: string;
  icon?: string;
  /** Pass products directly (e.g. from the home feed)… */
  products?: Product[];
  /** …or a GET endpoint that returns { data: Product[] } / { products: Product[] }. */
  fetchUrl?: string;
  /** Product id to drop from the list (e.g. the current product on its own page). */
  excludeId?: string;
  limit?: number;
}

const ProductRail: React.FC<ProductRailProps> = ({
  title,
  subtitle,
  icon,
  products: productsProp,
  fetchUrl,
  excludeId,
  limit = 12,
}) => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>(productsProp || []);
  const [loading, setLoading] = useState(Boolean(fetchUrl) && !productsProp);

  // Keep in sync when products are passed in (home feed loads asynchronously).
  useEffect(() => {
    if (productsProp) setProducts(productsProp);
  }, [productsProp]);

  useEffect(() => {
    if (!fetchUrl) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data } = await axiosInstance.get<{
          data?: Product[];
          products?: Product[];
        }>(fetchUrl);
        if (!cancelled) setProducts(data.data || data.products || []);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchUrl]);

  const items = (products || [])
    .filter((p) => p && p._id !== excludeId)
    .slice(0, limit);

  // Nothing to show once loading settles — render nothing rather than an empty block.
  if (!loading && items.length === 0) return null;

  return (
    <section className="py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="mb-5 sm:mb-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--text)]">
            {icon ? `${icon} ` : ""}
            {t(title)}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{t(subtitle)}</p>
          )}
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-[220px] sm:w-[240px] shrink-0 bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)] h-80"
              >
                <div className="w-full h-40 animate-shimmer rounded-lg mb-4" />
                <div className="h-5 animate-shimmer rounded-full w-3/4 mb-2" />
                <div className="h-4 animate-shimmer rounded-full w-1/2 mb-2" />
                <div className="h-6 animate-shimmer rounded-full w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-3 snap-x snap-mandatory [scrollbar-width:thin]">
            {items.map((product, idx) => (
              <div
                key={product._id}
                className="w-[220px] sm:w-[240px] lg:w-[260px] shrink-0 snap-start"
              >
                <ProductCard
                  id={product._id}
                  name={product.name}
                  price={getBaseUnitPrice(product)}
                  currency="EGP"
                  originalPrice={product.saleActive ? product.price : undefined}
                  image={product.images?.[0]?.url || "/placeholder.png"}
                  rating={product.rating}
                  description={product.description}
                  isOnSale={product.saleActive}
                  salePercentage={product.salePercentage}
                  isInStock={product.stock > 0}
                  stock={product.stock}
                  soldCount={product.soldCount}
                  priority={idx === 0}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductRail;
