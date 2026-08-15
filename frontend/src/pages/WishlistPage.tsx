import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import { useUserStore } from "../stores/user.store";
import { useProductStore } from "../stores/product.store";
import type { Product } from "../types/product.type";
import { getBaseUnitPrice } from "../lib/pricing";
import { cldImg, cldSrcSet } from "../lib/cldImage";
import PleaseLogin from "../components/PleaseLogin";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

type ViewMode = "grid" | "list";
type SortOption = "newest" | "price-low" | "price-high" | "name";

const WishlistPage: React.FC = () => {
  const { t } = useTranslation();
  const { getLovedProducts, toggleLoveProduct, loading: userLoading } = useUserStore();
  const { addToCart } = useProductStore();
  const user = useUserStore((state) => state.user);
  const [lovedProducts, setLovedProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);

  useEffect(() => { getLovedProducts(); }, [getLovedProducts]);
  useEffect(() => { if (user) setLovedProducts(user.love); }, [user]);

  const handleToggleLove = async (productId: string) => {
    setRemovingId(productId);
    try {
      const success = await toggleLoveProduct(productId);
      if (success) {
        await getLovedProducts();
        toast.success(t("wishlist.removedFromWishlist", "Removed from wishlist"));
      }
    } catch (error) {
      console.error("Error toggling love:", error);
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (productId: string) => {
    setAddingToCartId(productId);
    try {
      await addToCart(productId, 1);
      toast.success(t("wishlist.addedToCart", "Added to cart!"));
    } catch (error) {
      toast.error(t("wishlist.addToCartError", "Failed to add to cart"));
    } finally {
      setAddingToCartId(null);
    }
  };

  const handleAddAllToCart = async () => {
    for (const product of filteredProducts) {
      if (product._id && product.stock > 0) {
        await addToCart(product._id, 1);
      }
    }
    toast.success(t("wishlist.allAddedToCart", "All available items added to cart!"));
  };

  const handleClearAll = async () => {
    for (const product of lovedProducts) {
      if (product._id) await toggleLoveProduct(product._id);
    }
    setLovedProducts([]);
    toast.success(t("wishlist.cleared", "Wishlist cleared"));
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("wishlist.linkCopied", "Wishlist link copied!"));
    } catch {
      toast.error(t("wishlist.shareFailed", "Could not copy link"));
    }
  };

  const filteredProducts = useMemo(() => {
    let result = [...lovedProducts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "price-low": result.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price)); break;
      case "price-high": result.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price)); break;
      case "name": result.sort((a, b) => (a.name || "").localeCompare(b.name || "")); break;
      default: break;
    }
    return result;
  }, [lovedProducts, searchQuery, sortBy]);

  const stats = useMemo(() => {
    const totalValue = lovedProducts.reduce((sum, p) => sum + getBaseUnitPrice(p), 0);
    const onSale = lovedProducts.filter(p => p.saleActive).length;
    const outOfStock = lovedProducts.filter(p => p.stock <= 0).length;
    return { total: lovedProducts.length, totalValue, onSale, outOfStock };
  }, [lovedProducts]);

  const getEffectivePrice = (p: Product) => getBaseUnitPrice(p);
  const getDiscount = (p: Product) => {
    if (!p.saleActive) return 0;
    if (typeof p.salePercentage === "number" && p.salePercentage > 0) return Math.round(p.salePercentage);
    const eff = getBaseUnitPrice(p);
    return p.price > 0 ? Math.round(((p.price - eff) / p.price) * 100) : 0;
  };

  const renderProductCard = (item: Product) => {
    const isRemoving = removingId === item._id;
    const isAddingToCart = addingToCartId === item._id;
    const discount = getDiscount(item);
    const outOfStock = item.stock <= 0;

    if (viewMode === "list") {
      return (
        <div key={item._id} className={`group bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex gap-4 items-center transition-all hover:shadow-md hover:border-[var(--brand-primary)]/30 ${isRemoving ? "opacity-50 scale-95" : ""} ${outOfStock ? "opacity-70" : ""}`}>
          <Link to={`/product/${item._id}`} className="shrink-0 relative">
            <img src={item.images?.[0]?.url ? cldImg(item.images[0].url, { w: 200 }) : "/net3.jpeg"} alt={item.name} loading="lazy" decoding="async" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23f3f4f6'/><text x='32' y='38' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%239ca3af'>No image</text></svg>"; }} className="w-24 h-24 object-cover rounded-xl group-hover:scale-105 transition-transform" />
            {discount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">-{discount}%</span>}
            {outOfStock && <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center"><span className="text-white text-xs font-bold">{t("wishlist.outOfStock", "Out of Stock")}</span></div>}
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/product/${item._id}`}><h3 className="text-sm font-semibold text-[var(--text)] line-clamp-1 hover:text-[var(--brand-primary)] transition-colors">{item.name}</h3></Link>
            {item.description && <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">{item.description}</p>}
            <div className="flex items-center gap-2 mt-1.5">
              {item.rating > 0 && <div className="flex items-center gap-1"><span className="text-amber-400 text-xs">★</span><span className="text-xs text-[var(--text-muted)]">{item.rating.toFixed(1)}</span></div>}
              {item.stock > 0 && item.stock <= 5 && <span className="text-[10px] text-orange-500 font-medium">{t("wishlist.onlyLeft", "Only {{count}} left!", { count: item.stock })}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-base font-bold text-[var(--text)]">{getEffectivePrice(item).toLocaleString()} EGP</div>
            {discount > 0 && <div className="text-xs text-[var(--text-subtle)] line-through">{item.price.toLocaleString()} EGP</div>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => handleAddToCart(item._id!)} disabled={isAddingToCart || outOfStock} className="px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white hover:shadow-lg transition-all disabled:opacity-50">
              {isAddingToCart ? "..." : <span>🛒</span>}
            </button>
            <button onClick={() => handleToggleLove(item._id!)} disabled={isRemoving} className="p-2 rounded-xl border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div key={item._id} className={`group bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-[var(--brand-primary)]/5 hover:border-[var(--brand-primary)]/30 hover:-translate-y-1 ${isRemoving ? "opacity-50 scale-95" : ""}`}>
        <div className="relative aspect-square overflow-hidden bg-[var(--surface-2)]">
          <Link to={`/product/${item._id}`}>
            <img src={item.images?.[0]?.url ? cldImg(item.images[0].url, { w: 500 }) : "/net3.jpeg"} srcSet={cldSrcSet(item.images?.[0]?.url, 250)} sizes="(min-width: 1024px) 250px, (min-width: 640px) 33vw, 50vw" alt={item.name} loading="lazy" decoding="async" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23f3f4f6'/><text x='32' y='38' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%239ca3af'>No image</text></svg>"; }} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          </Link>
          {discount > 0 && <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">-{discount}%</div>}
          {outOfStock && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full">{t("wishlist.outOfStock", "Out of Stock")}</span></div>}
          {item.stock > 0 && item.stock <= 5 && <div className="absolute top-3 right-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">{t("wishlist.lowStock", "Low Stock")}</div>}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2 justify-center">
            <button onClick={() => handleAddToCart(item._id!)} disabled={isAddingToCart || outOfStock} className="flex-1 py-2 rounded-xl text-xs font-bold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-all disabled:opacity-50 flex items-center justify-center gap-1">
              {isAddingToCart ? <span className="animate-spin">⟳</span> : <>{t("wishlist.addToCart", "Add to Cart")} 🛒</>}
            </button>
            <button onClick={() => handleToggleLove(item._id!)} disabled={isRemoving} className="p-2 rounded-xl bg-white/90 text-red-500 hover:bg-red-500 hover:text-white transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
        <div className="p-4">
          <Link to={`/product/${item._id}`}><h3 className="text-sm font-semibold text-[var(--text)] line-clamp-2 leading-snug hover:text-[var(--brand-primary)] transition-colors">{item.name}</h3></Link>
          <div className="flex items-center gap-1.5 mt-2">
            {item.rating > 0 && (<><div className="flex">{[...Array(5)].map((_, i) => <span key={i} className={`text-xs ${i < Math.round(item.rating) ? "text-amber-400" : "text-[var(--border)]"}`}>★</span>)}</div><span className="text-[10px] text-[var(--text-subtle)]">({item.reviews?.length || 0})</span></>)}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-bold text-[var(--text)]">{getEffectivePrice(item).toLocaleString()} <span className="text-xs font-normal text-[var(--text-muted)]">EGP</span></span>
            {discount > 0 && <span className="text-xs text-[var(--text-subtle)] line-through">{item.price.toLocaleString()}</span>}
          </div>
        </div>
      </div>
    );
  };

  if (!user) return <PleaseLogin />;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />

      {/* Hero */}
      <PageHero
        eyebrow={t("wishlist.title", "My Wishlist")}
        title={t("wishlist.title", "My Wishlist")}
        subtitle={t("wishlist.subtitle", "Your curated collection of favorite products. Save items you love and never miss a deal.")}
        breadcrumb={[
          { label: t("common.home", "Home"), to: "/" },
          { label: t("wishlist.title", "Wishlist") },
        ]}
        aside={
          user && lovedProducts.length > 0 ? (
            <div className="flex gap-3 flex-wrap">
              {[
                { label: t("wishlist.statItems", "Items"), value: stats.total },
                { label: t("wishlist.statValue", "Total Value"), value: `${stats.totalValue.toLocaleString()} ${t("EGP")}` },
                ...(stats.onSale > 0 ? [{ label: t("wishlist.statOnSale", "On Sale"), value: stats.onSale }] : []),
              ].map((s, i) => (
                <div key={i} className="panel-glass rounded-xl px-4 py-3 text-center min-w-[6rem]">
                  <div className="text-[var(--on-ink)] font-bold text-base">{s.value}</div>
                  <div className="text-[var(--on-ink-muted)] text-[11px] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          ) : undefined
        }
      />

      <main className="py-8 lg:py-10">
        <div className="shell">
          {userLoading && lovedProducts.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--surface-2)] mb-4 animate-pulse">
                <span className="text-3xl">❤️</span>
              </div>
              <p className="text-[var(--text-muted)]">{t("wishlist.loading", "Loading your wishlist...")}</p>
            </div>
          ) : lovedProducts.length === 0 ? (
            /* ===== EMPTY STATE ===== */
            <div className="text-center py-16 max-w-lg mx-auto">
              <div className="relative inline-block mb-6">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-rose-100 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 flex items-center justify-center mx-auto">
                  <span className="text-5xl">💝</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[var(--surface-2)] border-2 border-[var(--border)] rounded-full flex items-center justify-center text-sm">✨</div>
              </div>
              <h2 className="text-2xl font-bold text-[var(--text)] mb-2">{t("wishlist.emptyTitle", "Your Wishlist is Empty")}</h2>
              <p className="text-sm text-[var(--text-muted)] mb-8 leading-relaxed">{t("wishlist.emptyDesc", "Start exploring our products and tap the heart icon on items you love. They'll appear here for easy access.")}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/products" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] hover:shadow-lg hover:shadow-[var(--brand-primary)]/20 transition-all">
                  {t("wishlist.browseProducts", "Browse Products")} →
                </Link>
                <Link to="/collections" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-[var(--text)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-all">
                  {t("wishlist.viewCollections", "View Collections")}
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* ===== TOOLBAR ===== */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3 flex-1 max-w-md w-full">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-subtle)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("wishlist.searchPlaceholder", "Search your wishlist...")} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all" />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40">
                    <option value="newest">{t("wishlist.sortNewest", "Newest First")}</option>
                    <option value="price-low">{t("wishlist.sortPriceLow", "Price: Low → High")}</option>
                    <option value="price-high">{t("wishlist.sortPriceHigh", "Price: High → Low")}</option>
                    <option value="name">{t("wishlist.sortName", "Name A-Z")}</option>
                  </select>
                  <div className="flex bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-0.5">
                    {(["grid", "list"] as ViewMode[]).map((mode) => (
                      <button key={mode} onClick={() => setViewMode(mode)} className={`p-2 rounded-lg transition-all ${viewMode === mode ? "bg-[var(--surface)] shadow-sm text-[var(--text)]" : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]"}`}>
                        {mode === "grid" ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="3" rx="1"/><rect x="1" y="6" width="14" height="3" rx="1"/><rect x="1" y="11" width="14" height="3" rx="1"/></svg>}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleShare} className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all" title={t("wishlist.share", "Share")}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  </button>
                </div>
              </div>

              {/* ===== QUICK ACTIONS BAR ===== */}
              <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-5 py-3 mb-6">
                <p className="text-sm text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text)]">{filteredProducts.length}</span> {t("wishlist.itemsFound", "items")}
                  {searchQuery && <span className="ml-1">{t("wishlist.matchingSearch", "matching")} &ldquo;{searchQuery}&rdquo;</span>}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={handleAddAllToCart} className="text-xs font-semibold text-[var(--brand-primary)] hover:underline">{t("wishlist.addAllToCart", "Add All to Cart")}</button>
                  <span className="text-[var(--border)]">|</span>
                  <button onClick={handleClearAll} className="text-xs font-semibold text-red-500 hover:underline">{t("wishlist.clearAll", "Clear All")}</button>
                </div>
              </div>

              {/* ===== PRODUCTS ===== */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-4xl">🔍</span>
                  <p className="text-[var(--text-muted)] mt-3">{t("wishlist.noResults", "No items match your search.")}</p>
                  <button onClick={() => setSearchQuery("")} className="text-sm text-[var(--brand-primary)] font-semibold mt-2 hover:underline">{t("wishlist.clearSearch", "Clear search")}</button>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredProducts.map(renderProductCard)}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProducts.map(renderProductCard)}
                </div>
              )}

              {/* ===== CONTINUE SHOPPING ===== */}
              <div className="mt-10 text-center">
                <Link to="/products" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-[var(--text)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-all">
                  ← {t("wishlist.continueShopping", "Continue Shopping")}
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WishlistPage;
