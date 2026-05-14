import React, { useMemo, lazy, Suspense } from "react";
import ProductCard from "../components/ProductCard";
import Header from "../components/Header";
import HeroSlider from "../components/HeroSlider";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { getBaseUnitPrice } from "../lib/pricing";
import CountdownTimer from "../components/CountdownTimer";
import ScrollReveal from "../components/ScrollReveal";
import { getCategoryIcon } from "../lib/categoryIcon";
import { useCollectionStore } from "../stores/collection.store";
import { useUserStore } from "../stores/user.store";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { cldImg } from "../lib/cldImage";
import { useHomeFeed } from "../lib/queries";

const FeaturedProducts = lazy(() => import("../components/FeaturedProducts"));
const Newsletter = lazy(() => import("../components/Newsletter"));
const Services = lazy(() => import("../components/Services"));
const BrandLogos = lazy(() => import("../components/BrandLogos"));
const AdvertisementBanner = lazy(() => import("../components/AdvertisementBanner"));
import type { Product } from "../types/product.type";
import type { Category } from "../types/category.type";
import toast from "react-hot-toast";

/* ─── Skeleton Components ─── */
const ProductCardSkeleton: React.FC = () => (
  <div className="bg-[var(--surface)] rounded-xl p-4 lg:p-5 border border-[var(--border)] flex flex-col h-full overflow-hidden">
    <div className="flex justify-center mb-4 rounded-lg bg-[var(--surface-2)]">
      <div className="w-32 h-32 lg:w-40 lg:h-40 animate-shimmer rounded-lg" />
    </div>
    <div className="text-center mb-3 flex-grow space-y-2">
      <div className="h-5 animate-shimmer rounded-full w-3/4 mx-auto" />
      <div className="h-3 animate-shimmer rounded-full w-1/2 mx-auto" />
      <div className="h-3 animate-shimmer rounded-full w-full mx-auto" />
    </div>
    <div className="text-center pt-2 border-t border-[var(--border)]/50">
      <div className="h-6 animate-shimmer rounded-full w-1/3 mx-auto" />
    </div>
  </div>
);

const CategorySkeleton: React.FC = () => (
  <div className="flex flex-col items-center gap-2 p-3">
    <div className="w-16 h-16 lg:w-20 lg:h-20 animate-shimmer rounded-full" />
    <div className="h-3 animate-shimmer rounded-full w-14" />
  </div>
);

/* ─── Section Header ─── */
const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  viewAllLink?: string;
  viewAllLabel?: string;
  extra?: React.ReactNode;
}> = ({ title, subtitle, viewAllLink, viewAllLabel, extra }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 lg:mb-8 gap-3">
      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--text)]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm sm:text-base text-[var(--text-muted)] mt-1">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {extra}
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-nav)] dark:text-[var(--brand-accent)] hover:gap-2.5 transition-all whitespace-nowrap group"
          >
            {viewAllLabel || t("View All")}
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
};

/* ─── Bundle Themes ─── */
// Warm orange spectrum derived from the Belgomla palette
// (orange #FF6A1A, orangeDeep #E8530A, orangeSoft #FFB382, ink #0B0B10).
const bundleThemes = [
  { gradient: "from-[#FF6A1A] to-[#E8530A]", badge: "📸" },
  { gradient: "from-[#FFB382] to-[#FF6A1A]", badge: "💼" },
  { gradient: "from-[#E8530A] to-[#FF6A1A]", badge: "🎮" },
  { gradient: "from-[#FF6A1A] to-[#0B0B10]", badge: "🌐" },
];

/* ═════════════════════ Main Page ═════════════════════ */
const HomePage: React.FC = () => {
  const { t } = useTranslation();
  useUserStore((s) => s.user);

  const { addCollectionToCart } = useCollectionStore();
  const fetchCart = useUserStore((state) => state.fetchCart);

  // Single batched fetch (cached + deduped by React Query).
  const { data: feed, isLoading: feedLoading } = useHomeFeed();
  const allProducts: Product[] = feed?.products ?? [];
  const saleProducts: Product[] = feed?.saleProducts ?? [];
  const newestProducts: Product[] = feed?.newestProducts ?? [];
  const categories: Category[] = feed?.categories ?? [];
  const collections: any[] = feed?.collections ?? [];
  const loadingAll = feedLoading;
  const loadingSale = feedLoading;
  const loadingNewest = feedLoading;
  const categoriesLoading = feedLoading;

  // Flash deal countdown — end of today
  const dealEndDate = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const handleAddBundleToCart = async (collectionId: string) => {
    const success = await addCollectionToCart(collectionId, 1);
    if (success) {
      await fetchCart();
      toast.success(t("Bundle added to cart!"));
    } else {
      toast.error(t("Failed to add bundle"));
    }
  };

  /* ── Render helpers ── */
  const renderProductGrid = (products: Product[], isLoading: boolean, count = 4) =>
    isLoading ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 stagger-children">
        {(products || []).slice(0, count).map((product, idx) => {
          const discounted = getBaseUnitPrice(product);
          return (
          <ProductCard
            key={product._id}
            id={product._id}
            name={product.name}
            price={discounted}
            currency="EGP"
            originalPrice={product.saleActive ? product.price : undefined}
            image={product.images?.[0]?.url || "/placeholder.png"}
            rating={product.rating}
            description={product.description}
            isNew={
              product.createdAt
                ? Date.now() - new Date(product.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
                : false
            }
            isOnSale={product.saleActive}
            isFeatured={product.featured}
            salePercentage={product.salePercentage}
            isInStock={product.stock > 0}
            stock={product.stock}
            priority={idx === 0}
          />
        );})}
      </div>
    );

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SEO
        title={t("Home")}
        description={t("Egypt's premier marketplace for IT, networking, and technology products. Shop routers, switches, cables, servers, cameras, and more at the best prices.")}
      />
      <Header />

      <main>
        {/* ════════════════════════════════════════════
            § 1.  HERO CAROUSEL  — First impression
            ════════════════════════════════════════════ */}
        <HeroSlider />

        {/* ════════════════════════════════════════════
            § 2.  TRUST BAR  — Instant credibility
            Place right below the hero so users see
            guarantees before they scroll into products
            ════════════════════════════════════════════ */}
        <ScrollReveal>
          <Suspense fallback={null}>
            <Services />
          </Suspense>
        </ScrollReveal>

        {/* ════════════════════════════════════════════
            § 3.  SHOP BY CATEGORY  — Navigation shortcut
            Lets users self-filter immediately
            ════════════════════════════════════════════ */}
        <ScrollReveal>
          <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-10">
            <SectionHeader
              title={`📁 ${t("Shop by Category")}`}
              viewAllLink="/categories"
              viewAllLabel={t("All Categories")}
            />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 stagger-children">
              {categoriesLoading
                ? Array.from({ length: 6 }).map((_, i) => <CategorySkeleton key={i} />)
                : (categories || []).slice(0, 12).map((cat: Category) => (
                    <Link
                      to={`/products?category=${cat._id}`}
                      key={cat._id}
                      className="group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand-accent)] hover:shadow-md transition-all duration-300"
                    >
                      <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-[var(--surface-2)] flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-300">
                        <span className="text-2xl sm:text-3xl" aria-hidden="true">
                          {getCategoryIcon(cat.name)}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-[var(--text-muted)] group-hover:text-[var(--text)] text-center line-clamp-2 transition-colors">
                        {cat.name}
                      </span>
                    </Link>
                  ))}
            </div>
          </section>
        </ScrollReveal>

        {/* ════════════════════════════════════════════
            § 4.  FLASH DEALS  — Urgency + scarcity
            Countdown timer creates FOMO
            ════════════════════════════════════════════ */}
        {(loadingSale || saleProducts.length > 0) && (
          <ScrollReveal>
            <section className="relative overflow-hidden py-8 sm:py-10 lg:py-14">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)]/8 via-transparent to-[var(--brand-accent)]/5" />
              <div className="absolute inset-0 bg-[var(--surface)]/60 dark:bg-[var(--bg)]/70 backdrop-blur-sm" />

              <div className="relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
                <SectionHeader
                  title={`🔥 ${t("Flash Deals")}`}
                  subtitle={t("Limited time offers — grab them before they're gone!")}
                  viewAllLink="/products?sale=true"
                  extra={
                    <CountdownTimer
                      targetDate={dealEndDate}
                      label={t("Ends in")}
                    />
                  }
                />
                {renderProductGrid(saleProducts, loadingSale, 4)}
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* ════════════════════════════════════════════
            § 5.  PROMOTIONAL BANNER (Hero Position)
            Visual break between product sections.
            Full-width promo creates rhythm.
            ════════════════════════════════════════════ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={null}>
            <AdvertisementBanner position="hero" />
          </Suspense>
        </div>

        {/* ════════════════════════════════════════════
            § 6.  FEATURED / EDITOR'S PICKS
            Hand-curated products build trust and
            guide undecided users toward best sellers
            ════════════════════════════════════════════ */}
        <ScrollReveal>
          <Suspense fallback={null}>
            <FeaturedProducts />
          </Suspense>
        </ScrollReveal>

        {/* ════════════════════════════════════════════
            § 7.  TRUSTED BRANDS  — Social proof
            Authority logos between product sections
            reinforces that the store carries genuine gear
            ════════════════════════════════════════════ */}
        <Suspense fallback={null}>
          <BrandLogos />
        </Suspense>

        {/* ════════════════════════════════════════════
            § 8.  NEWEST ARRIVALS  — Freshness signal
            Shows the catalog is alive and updated
            ════════════════════════════════════════════ */}
        <ScrollReveal>
          <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-10">
            <SectionHeader
              title={`✨ ${t("Just Arrived")}`}
              subtitle={t("The latest additions to our catalog")}
              viewAllLink="/products?sort=newest"
            />
            {loadingNewest ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : newestProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 stagger-children">
                {(newestProducts || []).slice(0, 4).map((product) => (
                  <ProductCard
                    key={product._id}
                    id={product._id}
                    name={product.name}
                    price={getBaseUnitPrice(product)}
                    currency="EGP"
                    originalPrice={product.saleActive ? product.price : undefined}
                    image={product.images?.[0]?.url || "/placeholder.png"}
                    rating={product.rating}
                    description={product.description}
                    isNew
                    isOnSale={product.saleActive}
                    salePercentage={product.salePercentage}
                    isInStock={product.stock > 0}
                    stock={product.stock}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </ScrollReveal>

        {/* ════════════════════════════════════════════
            § 9.  BANNER AD (Secondary Position)
            Wholesale/bulk CTA  — second visual break
            ════════════════════════════════════════════ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={null}>
            <AdvertisementBanner position="banner" />
          </Suspense>
        </div>

        {/* ════════════════════════════════════════════
            § 10. BUNDLE DEALS CTA  — Upsell opportunity
            Promote curated bundles to increase AOV.
            Mini-cards with one-click add-to-cart.
            ════════════════════════════════════════════ */}
        {(collections || []).length > 0 && (
          <ScrollReveal>
            <section className="py-10 sm:py-14">
              <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
                <SectionHeader
                  title={`📦 ${t("Save with Bundles")}`}
                  subtitle={t("Curated tech bundles at exclusive prices — save up to 25%")}
                  viewAllLink="/collections"
                  viewAllLabel={t("View All Bundles")}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                  {(collections || []).slice(0, 4).map((collection, index) => {
                    const theme = bundleThemes[index % bundleThemes.length];
                    const originalTotal = (collection.items || []).reduce((sum: number, item: any) => {
                      const product = item.product;
                      const unitPrice = product?.saleActive
                        ? product.price * (1 - product.salePercentage / 100)
                        : product?.price || 0;
                      return sum + unitPrice * item.quantity;
                    }, 0);
                    const savings = Math.max(originalTotal - collection.bundlePrice, 0);
                    const savingsPercent = originalTotal > 0 ? Math.round((savings / originalTotal) * 100) : 0;

                    return (
                      <div
                        key={collection._id}
                        className="group relative bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden hover:shadow-lg hover:border-[var(--brand-primary)]/30 transition-all duration-300"
                      >
                        {/* Top gradient accent */}
                        <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />

                        <div className="p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <span className="text-lg">{theme.badge}</span>
                              <h3 className="text-sm font-bold text-[var(--text)] leading-snug mt-0.5 line-clamp-1">
                                {collection.name}
                              </h3>
                            </div>
                            {savingsPercent > 0 && (
                              <span className={`shrink-0 text-[10px] font-bold text-white px-2 py-0.5 rounded-full bg-gradient-to-r ${theme.gradient}`}>
                                {savingsPercent}% {t("OFF")}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mb-3 leading-relaxed">
                            {collection.description}
                          </p>

                          {/* Mini product avatars */}
                          <div className="flex items-center gap-1.5 mb-3">
                            {(collection.items || []).slice(0, 3).map((item: any, i: number) => (
                              <div
                                key={i}
                                className="w-8 h-8 rounded-lg bg-white border border-[var(--border)] overflow-hidden"
                              >
                                <img
                                  src={cldImg(item.product?.images?.[0]?.url, { w: 80 })}
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                  width={32}
                                  height={32}
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                            {(collection.items?.length || 0) > 3 && (
                              <span className="text-[10px] text-[var(--text-muted)] font-medium">
                                +{(collection.items?.length || 0) - 3}
                              </span>
                            )}
                          </div>

                          {/* Price + CTA */}
                          <div className="flex items-end justify-between gap-2 pt-3 border-t border-[var(--border)]">
                            <div>
                              <span className="text-base font-black text-[var(--text)]">
                                {t("EGP")} {collection.bundlePrice.toLocaleString()}
                              </span>
                              {savings > 0 && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  💰 {t("Save")} {t("EGP")} {savings.toLocaleString()}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleAddBundleToCart(collection._id)}
                              className={`text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-gradient-to-r ${theme.gradient} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
                            >
                              🛒 {t("Add")}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* ════════════════════════════════════════════
            § 11. ALL PRODUCTS  — Full catalog browse
            Positioned lower so users who scrolled
            this far are engaged enough to explore more
            ════════════════════════════════════════════ */}
        <ScrollReveal>
          <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-10 lg:py-14">
            <SectionHeader
              title={t("All Products")}
              viewAllLink="/products"
            />
            {renderProductGrid(allProducts, loadingAll, 8)}

            {/* Empty state */}
            {!loadingAll && allProducts.length === 0 && (
              <div className="text-center py-16 animate-fadeIn">
                <p className="text-5xl mb-4 animate-float">🛍️</p>
                <h3 className="text-xl font-bold text-[var(--text)] mb-2">
                  {t("No products yet")}
                </h3>
                <p className="text-[var(--text-muted)] max-w-md mx-auto">
                  {t("Check back soon — new products are being added!")}
                </p>
              </div>
            )}
          </section>
        </ScrollReveal>

        {/* ════════════════════════════════════════════
            § 12. NEWSLETTER  — Capture engagement
            Last call-to-action before the footer.
            Users at the bottom are highly engaged.
            ════════════════════════════════════════════ */}
        <ScrollReveal>
          <Suspense fallback={null}>
            <Newsletter />
          </Suspense>
        </ScrollReveal>
      </main>

      <Footer />

      {/* Advertisement Popup */}
      <Suspense fallback={null}>
        <AdvertisementBanner position="popup" />
      </Suspense>
    </div>
  );
};

export default HomePage;
