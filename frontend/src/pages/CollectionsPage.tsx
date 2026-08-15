import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { useCollectionStore } from "../stores/collection.store";
import { cldImg } from "../lib/cldImage";
import AddBundleDialog from "../components/AddBundleDialog";

/* ─── gradient accents per bundle ─── */
// Belgomla orange spectrum — keep all tiles on-brand instead of a rainbow.
const bundleThemes = [
  { gradient: "from-[#FF6A1A] to-[#E8530A]", badge: "📸", tagline: "For Creators" },
  { gradient: "from-[#FFB382] to-[#FF6A1A]", badge: "💼", tagline: "For Business" },
  { gradient: "from-[#E8530A] to-[#FF6A1A]", badge: "🎮", tagline: "For Gamers" },
  { gradient: "from-[#FF6A1A] to-[#0B0B10]", badge: "🌐", tagline: "For Networks" },
  { gradient: "from-[#FFB382] to-[#E8530A]", badge: "⭐", tagline: "Featured" },
  { gradient: "from-[#E8530A] to-[#0B0B10]", badge: "🔥", tagline: "Hot Deal" },
];

const CollectionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { collections, loading, error, fetchCollections } = useCollectionStore();

  useEffect(() => {
    fetchCollections({ activeOnly: true });
  }, [fetchCollections]);

  const getOriginalTotal = (collection: any) =>
    collection.items.reduce((sum: number, item: any) => {
      const product = item.product;
      if (!product) return sum;
      const unitPrice = product.saleActive
        ? product.price * (1 - product.salePercentage / 100)
        : product.price;
      return sum + unitPrice * item.quantity;
    }, 0);

  // Adding from the listing goes through the same confirmation as the bundle's
  // own page — the fitting question has to be asked wherever the bundle is
  // added from, not only where it happens to be easiest to put a checkbox.
  const [pendingBundle, setPendingBundle] = useState<any | null>(null);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SEO
        title={t("Collections")}
        description={t("Curated tech bundles from Belgomla — pre-packaged sets for creators, businesses, gamers, and more, at bundle pricing.")}
      />
      <Header />

      {/* ═══ Hero ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] py-16 sm:py-24">
        <div className="absolute top-10 right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-cyan-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 text-sm text-white/80 mb-6">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            {t("Curated Tech Bundles")}
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            {t("Save More with")} <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">{t("Bundles")}</span>
          </h1>
          <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            {t("Hand-picked product bundles at exclusive prices. Each collection is expertly curated to give you the best value.")}
          </p>
        </div>
      </section>

      {/* ═══ Stats Strip ═══ */}
      <section className="relative z-10 -mt-8 max-w-4xl mx-auto px-4">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-lg grid grid-cols-3 divide-x divide-[var(--border)]">
          {[
            { value: collections.length || "—", label: t("Bundles Available") },
            { value: "15%+", label: t("Average Savings") },
            { value: t("Free"), label: t("Shipping on Bundles") },
          ].map((stat, i) => (
            <div key={i} className="p-4 sm:p-6 text-center">
              <p className="text-xl sm:text-2xl font-bold text-[var(--brand-primary)]">{stat.value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Bundles Grid ═══ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {loading && collections.length === 0 ? (
          /* Skeleton */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 animate-pulse">
                <div className="h-6 w-48 bg-[var(--border)] rounded mb-3" />
                <div className="h-4 w-full bg-[var(--border)] rounded mb-6" />
                <div className="space-y-3">
                  <div className="h-14 bg-[var(--border)] rounded-xl" />
                  <div className="h-14 bg-[var(--border)] rounded-xl" />
                </div>
                <div className="h-12 bg-[var(--border)] rounded-xl mt-6" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-[var(--text-muted)] mb-4">{error}</p>
            <button
              onClick={() => fetchCollections({ activeOnly: true })}
              className="bg-[var(--brand-primary)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {t("Try Again")}
            </button>
          </div>
        ) : collections.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-center justify-center text-4xl">
              📦
            </div>
            <h2 className="text-xl font-bold text-[var(--text)] mb-2">
              {t("No Bundles Available Yet")}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md mx-auto">
              {t("We're curating amazing tech bundles for you. Check back soon or browse our individual products.")}
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:shadow-lg transition-all"
            >
              {t("Browse All Products")} <span>→</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {collections.map((collection, index) => {
              const theme = bundleThemes[index % bundleThemes.length];
              const originalTotal = getOriginalTotal(collection);
              const savings = Math.max(originalTotal - collection.bundlePrice, 0);
              const savingsPercent = originalTotal > 0 ? Math.round((savings / originalTotal) * 100) : 0;

              return (
                <div
                  key={collection._id}
                  className="group relative bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden hover:shadow-xl hover:border-[var(--brand-primary)]/30 transition-all duration-300"
                >
                  {/* Top gradient accent */}
                  <div className={`h-1.5 bg-gradient-to-r ${theme.gradient}`} />

                  <div className="p-5 sm:p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-lg">{theme.badge}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r ${theme.gradient} bg-clip-text text-transparent`}>
                            {theme.tagline}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-[var(--text)] leading-snug">
                          {collection.name}
                        </h3>
                        {collection.description && (
                          <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                            {collection.description}
                          </p>
                        )}
                      </div>

                      {/* Savings badge */}
                      {savingsPercent > 0 && (
                        <div className={`shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${theme.gradient} text-white`}>
                          <span className="text-lg font-black leading-none">{savingsPercent}%</span>
                          <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">OFF</span>
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div className="space-y-2 mb-5">
                      {collection.items.map((item: any, i: number) => (
                        <div
                          key={`${collection._id}-${i}`}
                          className="flex items-center justify-between bg-[var(--bg)] rounded-xl p-3 border border-[var(--border)] hover:border-[var(--brand-primary)]/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-lg overflow-hidden bg-[var(--surface)] border border-[var(--border)] shrink-0">
                              <img
                                src={cldImg(item.product?.images?.[0]?.url, { w: 120 })}
                                alt={item.product?.name || t("Product")}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[var(--text)] truncate">
                                {item.product?.name || t("Product")}
                              </p>
                              <p className="text-[11px] text-[var(--text-muted)]">
                                {t("Qty")}: {item.quantity}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-[var(--text-muted)] font-medium shrink-0 ml-2">
                            EGP {item.product?.price?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Pricing */}
                    <div className="flex items-end justify-between gap-4 pt-4 border-t border-[var(--border)]">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-0.5">
                          {t("Bundle Price")}
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-[var(--text)]">
                            EGP {collection.bundlePrice.toLocaleString()}
                          </span>
                          {savings > 0 && (
                            <span className="text-xs text-[var(--text-muted)] line-through">
                              {originalTotal.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {savings > 0 && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                            💰 {t("You save")} {t("EGP")} {savings.toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/collections/${collection._id}`}
                          className="text-xs font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-accent)] transition-colors whitespace-nowrap"
                        >
                          {t("Details")} →
                        </Link>
                        <button
                          onClick={() => setPendingBundle(collection)}
                          className={`bg-gradient-to-r ${theme.gradient} text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap`}
                        >
                          🛒 {t("Add Bundle")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Why Bundles Section */}
        {collections.length > 0 && (
          <section className="mt-16 sm:mt-20">
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-2">
                {t("Why Buy Bundles?")}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                {t("Smart shopping starts with curated collections")}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { icon: "💰", title: t("Exclusive Savings"), desc: t("Save 10-25% compared to buying items individually. The more you bundle, the more you save.") },
                { icon: "✅", title: t("Expertly Curated"), desc: t("Each bundle is hand-picked by our tech experts to ensure perfect compatibility and maximum value.") },
                { icon: "🚚", title: t("Free Bundle Shipping"), desc: t("All bundles ship free regardless of destination. Fast, insured delivery across Egypt.") },
              ].map((item, i) => (
                <div key={i} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 text-center hover:shadow-md transition-shadow">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="text-sm font-bold text-[var(--text)] mb-1.5">{item.title}</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <AddBundleDialog
        collection={pendingBundle}
        open={!!pendingBundle}
        onClose={() => setPendingBundle(null)}
      />

      <Footer />
    </div>
  );
};

export default CollectionsPage;
