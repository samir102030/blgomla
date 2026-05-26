import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import ProductCard from "../components/ProductCard";
import CountdownTimer from "../components/CountdownTimer";
import CouponStrip from "../components/CouponStrip";
import { useSaleProducts } from "../lib/queries";
import { getBaseUnitPrice } from "../lib/pricing";
import type { Product } from "../types/product.type";

const DealsPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: saleProducts = [], isLoading } = useSaleProducts();

  const dealEndDate = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SEO
        title={t("Today's Deals")}
        description={t("Limited time offers — grab them before they're gone!")}
      />
      <Header />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0B0B10] via-[#15151C] to-[#0B0B10] text-white">
          <div className="absolute inset-0 opacity-20">
            <div
              className="absolute w-72 h-72 rounded-full blur-3xl"
              style={{
                background: "radial-gradient(circle, #FF6A1A, transparent)",
                top: "-20%",
                right: "10%",
              }}
            />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-3">
              🔥 {t("Today's Deals")}
            </h1>
            <p className="text-white/70 mb-6 max-w-xl mx-auto">
              {t("Limited time offers — grab them before they're gone!")}
            </p>
            <div className="flex justify-center">
              <CountdownTimer targetDate={dealEndDate} label={t("Ends in")} />
            </div>
          </div>
        </section>

        <CouponStrip title={t("Today's Coupons")} />

        <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 rounded-2xl bg-[var(--surface-2)] animate-pulse"
                />
              ))}
            </div>
          ) : saleProducts.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)]">
              <div className="text-5xl mb-3">🛍️</div>
              <p>{t("No active deals right now. Check back soon!")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 stagger-children">
              {saleProducts.map((product: Product, idx: number) => {
                const discounted = getBaseUnitPrice(product);
                return (
                  <ProductCard
                    key={product._id}
                    id={product._id}
                    name={product.name}
                    nameAr={product.nameAr}
                    price={discounted}
                    currency="EGP"
                    originalPrice={product.saleActive ? product.price : undefined}
                    image={product.images?.[0]?.url || "/placeholder.png"}
                    rating={product.rating}
                    description={product.description}
                    isOnSale={product.saleActive}
                    isFeatured={product.featured}
                    salePercentage={product.salePercentage}
                    isInStock={product.stock > 0}
                    stock={product.stock}
                    soldCount={product.soldCount}
                    priority={idx === 0}
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default DealsPage;
