import React, { useMemo, useState, lazy, Suspense } from "react";
import { useSectionOrder } from "../layout/useLayout";
import ProductCard from "../components/ProductCard";
import Header from "../components/Header";
import ManusHero from "../components/manus/ManusHero";
import Footer from "../components/Footer";
import AddBundleDialog from "../components/AddBundleDialog";
import SEO from "../components/SEO";
import { getBaseUnitPrice } from "../lib/pricing";
import CountdownTimer from "../components/CountdownTimer";
import ScrollReveal from "../components/ScrollReveal";
import { getCategoryIcon } from "../lib/categoryIcon";
import { useUserStore } from "../stores/user.store";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { cldImg, cldSrcSet } from "../lib/cldImage";
import { useHomeFeed } from "../lib/queries";
import CouponStrip from "../components/CouponStrip";
import HScroller from "../components/HScroller";

const FeaturedProducts = lazy(() => import("../components/FeaturedProducts"));
const ProductRail = lazy(() => import("../components/ProductRail"));
const RecentlyViewed = lazy(() => import("../components/RecentlyViewed"));
const Newsletter = lazy(() => import("../components/Newsletter"));
const Services = lazy(() => import("../components/Services"));
const BrandLogos = lazy(() => import("../components/BrandLogos"));
const AdvertisementBanner = lazy(() => import("../components/AdvertisementBanner"));
const CardMosaic = lazy(() => import("../components/CardMosaic"));
import type { Product } from "../types/product.type";
import type { Category } from "../types/category.type";

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
  <div className="flex flex-col rounded-2xl border border-[var(--border)] overflow-hidden">
    <div className="aspect-square w-full animate-shimmer" />
    <div className="px-2 py-2.5 flex justify-center">
      <div className="h-3 animate-shimmer rounded-full w-3/4" />
    </div>
  </div>
);

/* ─── Section Header ───
   One heading treatment for every home section: an optional eyebrow, the
   title, an optional subtitle, and a "view all" pill pinned to the end of the
   row. Emoji prefixes were doing the work of an icon badly — `icon` takes a
   node and renders it in a brand tile instead. */
const SectionHeader: React.FC<{
  title: string;
  eyebrow?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  viewAllLink?: string;
  viewAllLabel?: string;
  extra?: React.ReactNode;
}> = ({ title, eyebrow, subtitle, icon, viewAllLink, viewAllLabel, extra }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 lg:mb-9 gap-4">
      <div className="min-w-0">
        {eyebrow && <span className="eyebrow mb-2.5">{eyebrow}</span>}
        <div className="flex items-center gap-3">
          {icon && <span className="icon-tile">{icon}</span>}
          <h2 className="text-display-sm text-[var(--text)]">{title}</h2>
        </div>
        {subtitle && (
          <p className="text-sm sm:text-base text-[var(--text-muted)] mt-2 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {extra}
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)] whitespace-nowrap transition-all hover:border-[var(--brand-primary)] hover:text-[var(--brand-accent)] hover:shadow-[var(--shadow-md)]"
          >
            {viewAllLabel || t("View All")}
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
};

/* Inline icons for the section headers — 20px stroke icons sized by the tile. */
const Ico = {
  grid: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A1.5 1.5 0 015.5 4h4A1.5 1.5 0 0111 5.5v4A1.5 1.5 0 019.5 11h-4A1.5 1.5 0 014 9.5v-4zm9 0A1.5 1.5 0 0114.5 4h4A1.5 1.5 0 0120 5.5v4a1.5 1.5 0 01-1.5 1.5h-4A1.5 1.5 0 0113 9.5v-4zm-9 9A1.5 1.5 0 015.5 13h4a1.5 1.5 0 011.5 1.5v4A1.5 1.5 0 019.5 20h-4A1.5 1.5 0 014 18.5v-4zm9 0a1.5 1.5 0 011.5-1.5h4a1.5 1.5 0 011.5 1.5v4a1.5 1.5 0 01-1.5 1.5h-4a1.5 1.5 0 01-1.5-1.5v-4z" />
    </svg>
  ),
  bolt: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  sparkles: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  box: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  catalog: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
};

/* ─── Bundle Themes ─── */
// Warm orange spectrum derived from the Belgomla palette
// (orange #00A8E8, orangeDeep #0077B6, orangeSoft #7FD8FF, ink #0B0B10).
const bundleThemes = [
  { gradient: "from-[#00A8E8] to-[#0077B6]", badge: "📸" },
  { gradient: "from-[#7FD8FF] to-[#00A8E8]", badge: "💼" },
  { gradient: "from-[#0077B6] to-[#00A8E8]", badge: "🎮" },
  { gradient: "from-[#00A8E8] to-[#0B0B10]", badge: "🌐" },
];

/* ═════════════════════ Main Page ═════════════════════ */
const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  useUserStore((s) => s.user);


  // Single batched fetch (cached + deduped by React Query).
  const { data: feed, isLoading: feedLoading } = useHomeFeed();
  const allProducts: Product[] = feed?.products ?? [];
  const saleProducts: Product[] = feed?.saleProducts ?? [];
  const newestProducts: Product[] = feed?.newestProducts ?? [];
  const bestSellers: Product[] = feed?.bestSellers ?? [];
  const topRated: Product[] = feed?.topRated ?? [];
  // Hidden means hidden everywhere, not just in the menu — the home strip
  // showed every category the API returned, so switching one off in the
  // dashboard would have left it sitting on the front page. Ordered by the
  // arrangement set under Storefront visibility.
  const categories: Category[] = useMemo(
    () =>
      ((feed?.categories ?? []) as Category[])
        .filter((c) => (c as { isActive?: boolean }).isActive !== false)
        .sort(
          (a, b) =>
            ((a as { sortOrder?: number }).sortOrder ?? 0) -
            ((b as { sortOrder?: number }).sortOrder ?? 0)
        ),
    [feed?.categories]
  );
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

  // Same confirmation as the bundles listing and the bundle's own page — the
  // fitting question follows the bundle, not the page it was added from.
  const [pendingBundle, setPendingBundle] = useState<any | null>(null);

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
            nameAr={product.nameAr}
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
            soldCount={product.soldCount}
            priority={idx === 0}
          />
        );})}
      </div>
    );

  // Which sections this page shows, and in what order — arranged by an admin
  // in the dashboard rather than fixed here in JSX.
  const sectionOrder = useSectionOrder("home");

  const sectionNodes: Record<string, React.ReactNode> = {
    hero: (
      <>
        {/* ════════════════════════════════════════════
            § 1.  SOLUTION BANNER — First impression
            ────────────────────────────────────────────
            The one piece kept from the design package. The wrapper carries
            the charcoal ground and Cairo the preview put on `body`; scoping
            it here keeps the rest of the storefront — and the admin — on the
            theme they already have.
            ════════════════════════════════════════════ */}
        <div className="mn-scope mn-commerce-home">
          <ManusHero />
        </div>
      </>
    ),
    services: (
      <>
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
      </>
    ),
    categoryRail: (
      <>
        {/* ════════════════════════════════════════════
            § 3.  SHOP BY CATEGORY  — Navigation shortcut
            Lets users self-filter immediately
            ════════════════════════════════════════════ */}
        <ScrollReveal>
          <section className="shell section-y">
            <SectionHeader
              eyebrow={t("Categories")}
              title={t("Shop by Category")}
              subtitle={t("Jump straight to the gear you came for")}
              icon={Ico.grid}
              viewAllLink="/categories"
              viewAllLabel={t("All Categories")}
            />
            <HScroller>
              {categoriesLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="w-[150px] sm:w-[170px] lg:w-[190px] shrink-0 snap-start">
                      <CategorySkeleton />
                    </div>
                  ))
                : // Top level only. Listing every category here stood a
                  // subcategory on the shelf beside its own parent, so nesting
                  // two categories made the strip advertise both ways in as
                  // though they were unrelated ranges.
                  (categories || [])
                    .filter((cat: Category) => !cat.parentCategory)
                    .map((cat: Category) => (
                    <Link
                      to={`/products?category=${cat._id}`}
                      key={cat._id}
                      className="group w-[150px] sm:w-[170px] lg:w-[190px] shrink-0 snap-start flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden hover:border-[var(--brand-accent)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="aspect-square w-full bg-[#ffffff] overflow-hidden flex items-center justify-center p-3 sm:p-4">
                        {cat.image ? (
                          <img
                            src={cldImg(cat.image, { w: 400 })}
                            srcSet={cldSrcSet(cat.image, 200)}
                            sizes="190px"
                            alt={cat.name}
                            width={200}
                            height={200}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          (() => {
                            const Icon = getCategoryIcon(cat.name);
                            return (
                              <Icon
                                className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--text-muted)] group-hover:scale-105 group-hover:text-[var(--brand-primary)] transition-all duration-300"
                                aria-hidden="true"
                              />
                            );
                          })()
                        )}
                      </div>
                      <span className="px-2 py-2.5 text-xs sm:text-sm font-medium text-[var(--text-muted)] group-hover:text-[var(--text)] text-center line-clamp-2 transition-colors">
                        {i18n.language === 'ar' && cat.nameAr ? cat.nameAr : cat.name}
                      </span>
                    </Link>
                  ))}
            </HScroller>
          </section>
        </ScrollReveal>
      </>
    ),
    adCategoryStrip: (
      <>
        {/* Category-strip promo banner */}
        <div className="shell">
          <Suspense fallback={null}>
            <AdvertisementBanner position="category-strip" />
          </Suspense>
        </div>
      </>
    ),
    cardMosaic: (
      <>
        {/* Card mosaic — admin-curated merchandising grid */}
        <ScrollReveal>
          <Suspense fallback={null}>
            <CardMosaic />
          </Suspense>
        </ScrollReveal>
      </>
    ),
    couponStrip: (
      <>
        {/* Collectible coupons */}
        <ScrollReveal>
          <CouponStrip />
        </ScrollReveal>
      </>
    ),
    flashDeals: (
      <>
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

              <div className="relative shell">
                <SectionHeader
                  eyebrow={t("Limited time")}
                  title={t("Flash Deals")}
                  subtitle={t("Limited time offers — grab them before they're gone!")}
                  icon={Ico.bolt}
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
      </>
    ),
    adHero: (
      <>
        {/* ════════════════════════════════════════════
            § 5.  PROMOTIONAL BANNER (Hero Position)
            Visual break between product sections.
            Full-width promo creates rhythm.
            ════════════════════════════════════════════ */}
        <div className="shell">
          <Suspense fallback={null}>
            <AdvertisementBanner position="hero" />
          </Suspense>
        </div>
      </>
    ),
    featured: (
      <>
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
      </>
    ),
    bestsellers: (
      <>
        {/* Bestsellers — social proof that nudges undecided buyers */}
        {bestSellers.length > 0 && (
          <ScrollReveal>
            <Suspense fallback={null}>
              <ProductRail
                icon="🏆"
                title="Bestsellers"
                subtitle="Most-ordered products this season"
                products={bestSellers}
              />
            </Suspense>
          </ScrollReveal>
        )}
      </>
    ),
    topRated: (
      <>
        {/* Top Rated — quality signal from real reviews */}
        {topRated.length > 0 && (
          <ScrollReveal>
            <Suspense fallback={null}>
              <ProductRail
                icon="⭐"
                title="Top Rated"
                subtitle="Highest-rated by our customers"
                products={topRated}
              />
            </Suspense>
          </ScrollReveal>
        )}
      </>
    ),
    recentlyViewed: (
      <>
        {/* Recently Viewed — personalized re-engagement (localStorage-driven) */}
        <ScrollReveal>
          <Suspense fallback={null}>
            <RecentlyViewed />
          </Suspense>
        </ScrollReveal>
      </>
    ),
    brandLogos: (
      <>
        {/* ════════════════════════════════════════════
            § 7.  TRUSTED BRANDS  — Social proof
            Authority logos between product sections
            reinforces that the store carries genuine gear
            ════════════════════════════════════════════ */}
        <Suspense fallback={null}>
          <BrandLogos />
        </Suspense>
      </>
    ),
    newArrivals: (
      <>
        {/* ════════════════════════════════════════════
            § 8.  NEWEST ARRIVALS  — Freshness signal
            Shows the catalog is alive and updated
            ════════════════════════════════════════════ */}
        <ScrollReveal>
          <section className="shell section-y">
            <SectionHeader
              eyebrow={t("New in")}
              title={t("Just Arrived")}
              subtitle={t("The latest additions to our catalog")}
              icon={Ico.sparkles}
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
                    nameAr={product.nameAr}
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
                    soldCount={product.soldCount}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </ScrollReveal>
      </>
    ),
    adBanner: (
      <>
        {/* ════════════════════════════════════════════
            § 9.  BANNER AD (Secondary Position)
            Wholesale/bulk CTA  — second visual break
            ════════════════════════════════════════════ */}
        <div className="shell">
          <Suspense fallback={null}>
            <AdvertisementBanner position="banner" />
          </Suspense>
        </div>
      </>
    ),
    bundleDeals: (
      <>
        {/* ════════════════════════════════════════════
            § 10. BUNDLE DEALS CTA  — Upsell opportunity
            Promote curated bundles to increase AOV.
            Mini-cards with one-click add-to-cart.
            ════════════════════════════════════════════ */}
        {(collections || []).length > 0 && (
          <ScrollReveal>
            <section className="section-y">
              <div className="shell">
                <SectionHeader
                  eyebrow={t("Bundles")}
                  title={t("Save with Bundles")}
                  subtitle={t("Curated tech bundles at exclusive prices — save up to 25%")}
                  icon={Ico.box}
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
                                className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] overflow-hidden"
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
                              onClick={() => setPendingBundle(collection)}
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
      </>
    ),
    allProducts: (
      <>
        {/* ════════════════════════════════════════════
            § 11. ALL PRODUCTS  — Full catalog browse
            Positioned lower so users who scrolled
            this far are engaged enough to explore more
            ════════════════════════════════════════════ */}
        <ScrollReveal>
          <section className="shell section-y">
            <SectionHeader
              eyebrow={t("Catalog")}
              title={t("All Products")}
              subtitle={t("Browse the full range — filter by category, brand, or price")}
              icon={Ico.catalog}
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
      </>
    ),
    newsletter: (
      <>
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
      </>
    ),
  };


  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SEO
        title={t("Home")}
        description={t("Egypt's premier marketplace for IT, networking, and technology products. Shop routers, switches, cables, servers, cameras, and more at the best prices.")}
      />
      <Header />

      {/* Section order comes from the layout an admin arranges in the
          dashboard. An unknown key renders nothing rather than throwing, so
          a section removed from the code cannot take the page down. */}
      <main>
        {sectionOrder.map((key) => (
          <React.Fragment key={key}>{sectionNodes[key]}</React.Fragment>
        ))}

        {/* The close of the Smart Solutions journey — guidance cards, the
            consultation banner, and the service values. It sits after the
            catalogue sections rather than inside the ordered list because the
            design package puts it last on the page, after the products, and
            an admin reordering the storefront should not be able to strand
            the page's final call to action somewhere in the middle. */}
      </main>

      <AddBundleDialog
        collection={pendingBundle}
        open={!!pendingBundle}
        onClose={() => setPendingBundle(null)}
      />

      <Footer />

      {/* Advertisement Popup */}
      <Suspense fallback={null}>
        <AdvertisementBanner position="popup" />
      </Suspense>
    </div>
  );
};

export default HomePage;
