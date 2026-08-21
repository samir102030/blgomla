import React, { useState, useEffect } from "react";
import { StarIcon } from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/user.store";
import { useCompareStore, COMPARE_MAX } from "../stores/compare.store";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { cldImg, cldSrcSet } from "../lib/cldImage";

interface ProductCardProps {
  id: string;
  name: string;
  nameAr?: string;
  price: number;
  currency?: string;
  originalPrice?: number;
  image: string;
  rating: number;
  description?: string;
  isNew?: boolean;
  isOnSale?: boolean;
  isFeatured?: boolean;
  salePercentage?: number;
  stock?: number;
  soldCount?: number;
  isInStock?: boolean;
  // First card on a page sets the LCP; skip lazy-load + boost fetch priority.
  priority?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  nameAr,
  price,
  currency = "EGP",
  originalPrice,
  image,
  rating = 0,
  description,
  isNew = false,
  isOnSale = false,
  isFeatured = false,
  salePercentage,
  stock,
  soldCount = 0,
  isInStock,
  priority = false,
}) => {
  const { t, i18n } = useTranslation();
  const displayName = i18n.language === "ar" && nameAr ? nameAr : name;
  const navigate = useNavigate();
  const { user, toggleLoveProduct, getLovedProducts } = useUserStore();
  const compareIds = useCompareStore((s) => s.ids);
  const toggleCompare = useCompareStore((s) => s.toggle);
  const inCompare = compareIds.includes(id);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Check if product is in user's wishlist
  useEffect(() => {
    if (user?.love && Array.isArray(user.love)) {
      const isInWishlist = user.love.some((product) => product._id === id);
      setIsWishlisted(isInWishlist);
    } else {
      setIsWishlisted(false);
    }
  }, [user?.love, id]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-xs ${
          i < Math.floor(rating)
            ? "text-amber-400"
            : "text-[var(--border-strong)]"
        }`}
      >
        <StarIcon className="w-6 h-6" aria-hidden="true" />
      </span>
    ));
  };

  const hasStockInfo = stock !== undefined || isInStock !== undefined;
  const hasStock = stock !== undefined ? stock > 0 : isInStock ?? false;
  const stockLabel = hasStock
    ? stock !== undefined
      ? stock <= 5
        ? `${t("Only")} ${stock} ${t("left")}`
        : t("In Stock")
      : t("In Stock")
    : t("Out of Stock");
  const stockBadgeClasses = hasStock
    ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30"
    : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30";

  const handleCompare = () => {
    if (inCompare) {
      toggleCompare(id);
      toast.success(t("Removed from compare"));
      return;
    }
    const added = toggleCompare(id);
    if (added) toast.success(t("Added to compare"));
    else toast.error(t("You can compare up to {{max}} products", { max: COMPARE_MAX }));
  };

  const toggleWishlist = async () => {
    if (!user) {
      toast.error(t("Please login to add items to wishlist"));
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
      const success = await toggleLoveProduct(id);
      if (success) {
        await getLovedProducts();
        toast.success(
          isWishlisted ? t("Removed from wishlist") : t("Added to wishlist")
        );
      } else {
        toast.error(t("Failed to update wishlist"));
      }
    } catch {
      toast.error(t("Failed to update wishlist"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="group relative bg-[var(--surface)] rounded-2xl border border-[var(--border)] card-hover flex flex-col h-full overflow-hidden">
      {/* Badges — pinned to the reading start so they never collide with the
          wishlist / compare stack on the opposite corner. */}
      <div className="absolute top-3 ltr:left-3 rtl:right-3 flex flex-col items-start gap-1.5 z-10">
        {isFeatured && (
          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white ps-2 pe-2.5 py-1 text-[10px] font-bold rounded-full shadow-sm">
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 1.5l2.47 5.005 5.53.804-4 3.898.944 5.507L10 14.115l-4.944 2.6.944-5.508-4-3.898 5.53-.804L10 1.5z" />
            </svg>
            {t("Featured")}
          </span>
        )}
        {isNew && (
          <span className="text-white px-2.5 py-1 text-[10px] font-bold rounded-full shadow-sm" style={{ background: "var(--brand-gradient)" }}>
            {t("New")}
          </span>
        )}
        {isOnSale && salePercentage && (
          <span className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-2.5 py-1 text-[10px] font-bold rounded-full shadow-sm tabular-nums">
            -{salePercentage}%
          </span>
        )}
      </div>

      {/* Wishlist Button */}
      <button
        onClick={toggleWishlist}
        disabled={isLoading}
        className="absolute top-3 ltr:right-3 rtl:left-3 z-10 w-9 h-9 rounded-xl bg-[var(--surface)]/90 backdrop-blur-sm border border-[var(--border)] flex items-center justify-center hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {isLoading ? (
          <svg
            className="w-4 h-4 text-[var(--text-subtle)] animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg
            className={`w-4 h-4 transition-all duration-200 ${
              isWishlisted ? "text-red-500 fill-current scale-110" : "text-[var(--text-subtle)]"
            }`}
            fill={isWishlisted ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        )}
      </button>

      {/* Compare Button */}
      <button
        onClick={handleCompare}
        title={t("Compare")}
        aria-label={t("Compare")}
        className={`absolute top-14 ltr:right-3 rtl:left-3 z-10 w-9 h-9 rounded-xl backdrop-blur-sm border flex items-center justify-center transition-all duration-200 shadow-sm ${
          inCompare
            ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white"
            : "bg-[var(--surface)]/90 border-[var(--border)] text-[var(--text-subtle)] hover:border-[var(--brand-primary)]"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h2m6-16h2a2 2 0 012 2v12a2 2 0 01-2 2h-2m-6 0h6M9 5v16m6-16v16" />
        </svg>
      </button>

      {/* Product Image — always on a light background, even in dark mode, so
          product photos (typically shot on white) blend in instead of glowing. */}
      <div className="relative flex justify-center p-4 sm:p-5 flex-grow img-zoom bg-white rounded-t-2xl">
        {!imgLoaded && (
          <div className="absolute inset-0 animate-shimmer rounded-t-2xl" />
        )}
        <Link to={`/product/${id}`} className="flex items-center justify-center w-full py-2">
          <img
            src={cldImg(image, { w: 400 })}
            srcSet={cldSrcSet(image, 200)}
            sizes="(min-width: 1024px) 176px, (min-width: 640px) 144px, 112px"
            alt={displayName}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            width={176}
            height={176}
            onLoad={() => setImgLoaded(true)}
            onError={(e) => {
              setImgLoaded(true);
              (e.currentTarget as HTMLImageElement).src =
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23f3f4f6'/><text x='32' y='38' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%239ca3af'>No image</text></svg>";
            }}
            className={`w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 object-contain transition-all duration-500 group-hover:scale-105 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </Link>

        {/* Quick View overlay */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
          <Link
            to={`/product/${id}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[var(--brand-primary)] text-white text-xs sm:text-sm font-semibold hover:bg-[var(--brand-primary-hover)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {t("Quick View")}
          </Link>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 sm:p-5 flex flex-col flex-grow">
        <Link to={`/product/${id}`}>
          <h3 className="text-sm sm:text-base font-semibold text-[var(--text)] mb-1.5 line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem] hover:text-[var(--brand-primary)] transition-colors cursor-pointer leading-snug">
            {displayName}
          </h3>
        </Link>
        {/* Honest social proof from real data */}
        {(soldCount >= 10 || (typeof stock === "number" && stock > 0 && stock <= 5)) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {soldCount >= 50 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
 {t("Bestseller")}
              </span>
            ) : soldCount >= 10 ? (
              <span className="text-[10px] font-medium text-[var(--text-subtle)]">
                {t("{{count}} sold", { count: soldCount })}
              </span>
            ) : null}
            {typeof stock === "number" && stock > 0 && stock <= 5 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                {t("Only {{count}} left", { count: stock })}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center mb-2 gap-0.5">
          {renderStars(rating)}
          <span className="text-[11px] text-[var(--text-subtle)] ml-1.5">
            ({rating.toFixed(1)})
          </span>
        </div>
        {/* One line only — a taste of the description here, the whole of it on
            the product page. Two lines used to eat the card and still cut off
            mid-sentence, and phones were shown nothing at all. */}
        {description && (
          <p className="text-[var(--text-subtle)] text-xs leading-snug line-clamp-1 min-h-[1.125rem] mb-3">
            {description}
          </p>
        )}

        {/* Price + availability share one row so the card bottoms line up
            across a grid regardless of how long the product name ran. */}
        <div className="mt-auto pt-3 border-t border-[var(--border)]">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                {/* Full-price items read in the normal text colour; a
                    discounted price switches to brand orange so the saving is
                    what catches the eye, not every price on the grid. */}
                {price > 0 ? (
                  <>
                    <span
                      className={`text-lg sm:text-xl font-extrabold tracking-tight tabular-nums ${
                        originalPrice ? "text-[var(--brand-accent)]" : "text-[var(--text)]"
                      }`}
                    >
                      {price.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                      {currency}
                    </span>
                  </>
                ) : (
                  /* Priced per order. Showing the stored zero would read as free. */
                  <span className="text-sm font-bold text-[var(--brand-accent)]">
                    {t("Request a quote")}
                  </span>
                )}
              </div>
              {originalPrice && (
                <span className="text-xs text-[var(--text-subtle)] line-through tabular-nums">
                  {originalPrice.toLocaleString()} {currency}
                </span>
              )}
            </div>
            {hasStockInfo && (
              <span
                className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded-full ${stockBadgeClasses}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${hasStock ? "bg-emerald-500" : "bg-red-500"}`}
                  aria-hidden="true"
                />
                {stockLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
