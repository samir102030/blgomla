import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Header from "../components/Header";
import PageHero from "../components/PageHero";
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
        {/* Hero — the countdown moves opposite the title, where it reads as
            part of the offer rather than as a stray widget under it. */}
        <PageHero
          eyebrow={t("Limited time")}
          title={t("Today's Deals")}
          subtitle={t("Limited time offers — grab them before they're gone!")}
          breadcrumb={[{ label: t("Home"), to: "/" }, { label: t("Today's Deals") }]}
          aside={<CountdownTimer targetDate={dealEndDate} label={t("Ends in")} />}
        />

        <CouponStrip title={t("Today's Coupons")} />

        <section className="shell py-8">
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
 <div className="text-5xl mb-3"></div>
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
