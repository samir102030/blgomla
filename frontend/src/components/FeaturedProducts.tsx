import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ProductCard from "./ProductCard";
import { getBaseUnitPrice } from "../lib/pricing";
import { axiosInstance } from "../lib/axios";
import type { Product } from "../types/product.type";

const FeaturedProducts: React.FC = () => {
  const { t } = useTranslation();
  // Local state instead of the shared product store — otherwise the featured
  // fetch overwrites the global products list and breaks pages like All Products.
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get<{ data: Product[] }>(
          "/products/featured"
        );
        if (!cancelled) setProducts(data.data || []);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Don't render if no featured products
  if (!loading && (!products || products.length === 0)) return null;

  return (
    <section className="relative section-y bg-[var(--surface-2)] border-y border-[var(--border)] mesh-brand">
      <div className="relative shell">
        <div className="text-center mb-9 lg:mb-12">
          <span className="eyebrow eyebrow-center mb-3">{t("Editor's picks")}</span>
          <h2 className="text-display-sm text-[var(--text)]">
            {t("Featured Products")}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
            {t("Hand-picked items our customers love the most")}
          </p>
          <span
            className="mt-5 mx-auto block h-1 w-16 rounded-full"
            style={{ background: "var(--brand-gradient)" }}
            aria-hidden="true"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)] h-80"
              >
                <div className="w-full h-40 animate-shimmer rounded-lg mb-4" />
                <div className="h-5 animate-shimmer rounded-full w-3/4 mx-auto mb-2" />
                <div className="h-4 animate-shimmer rounded-full w-1/2 mx-auto mb-2" />
                <div className="h-6 animate-shimmer rounded-full w-1/3 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 stagger-children">
            {products.map((product, idx) => (
              <ProductCard
                key={product._id}
                id={product._id}
                name={product.name}
                nameAr={product.nameAr}
                price={getBaseUnitPrice(product)}
                currency="EGP"
                originalPrice={product.saleActive ? product.price : undefined}
                image={product.images?.[0]?.url || "/placeholder.png"}
                rating={product.rating}
                description={product.description}
                isFeatured
                isOnSale={product.saleActive}
                salePercentage={product.salePercentage}
                isInStock={product.stock > 0}
                stock={product.stock}
                soldCount={product.soldCount}
                priority={idx === 0}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;
