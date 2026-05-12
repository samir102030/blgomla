import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/user.store";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface ProductCardProps {
  id: string;
  name: string;
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
  isInStock?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  currency = "EGP",
  originalPrice,
  image,
  rating,
  description,
  isNew = false,
  isOnSale = false,
  isFeatured = false,
  salePercentage,
  stock,
  isInStock,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, toggleLoveProduct, getLovedProducts } = useUserStore();
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
        ★
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
      {/* Badges */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
        {isFeatured && (
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-1 text-[10px] font-bold rounded-lg shadow-sm uppercase tracking-wider">
            ⭐ {t("Featured")}
          </span>
        )}
        {isNew && (
          <span className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white px-2.5 py-1 text-[10px] font-bold rounded-lg shadow-sm uppercase tracking-wider">
            {t("New")}
          </span>
        )}
        {isOnSale && salePercentage && (
          <span className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-2.5 py-1 text-[10px] font-bold rounded-lg shadow-sm">
            -{salePercentage}%
          </span>
        )}
      </div>

      {/* Wishlist Button */}
      <button
        onClick={toggleWishlist}
        disabled={isLoading}
        className="absolute top-3 right-3 z-10 w-9 h-9 rounded-xl bg-[var(--surface)]/90 backdrop-blur-sm border border-[var(--border)] flex items-center justify-center hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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

      {/* Product Image */}
      <div className="relative flex justify-center p-4 sm:p-5 flex-grow img-zoom bg-[var(--surface-2)]/50">
        {!imgLoaded && (
          <div className="absolute inset-0 animate-shimmer rounded-t-2xl" />
        )}
        <Link to={`/product/${id}`} className="flex items-center justify-center w-full py-2">
          <img
            src={image}
            alt={name}
            loading="lazy"
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
          <h3 className="text-sm sm:text-base font-semibold text-[var(--text)] mb-1.5 line-clamp-2 hover:text-[var(--brand-primary)] transition-colors cursor-pointer leading-snug">
            {name}
          </h3>
        </Link>
        <div className="flex items-center mb-2 gap-0.5">
          {renderStars(rating)}
          <span className="text-[11px] text-[var(--text-subtle)] ml-1.5">
            ({rating.toFixed(1)})
          </span>
        </div>
        {description && (
          <p className="text-[var(--text-subtle)] text-xs leading-relaxed line-clamp-2 hidden sm:block mb-3">
            {description}
          </p>
        )}

        {/* Price */}
        <div className="mt-auto pt-3 border-t border-[var(--border)]/50">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg sm:text-xl font-bold text-[var(--brand-primary)]">
              {price.toLocaleString()}{" "}
              <span className="text-xs font-medium text-[var(--text-muted)]">
                {currency}
              </span>
            </span>
            {originalPrice && (
              <span className="text-sm text-[var(--text-subtle)] line-through">
                {originalPrice.toLocaleString()}
              </span>
            )}
          </div>
          {hasStockInfo && (
            <div className="mt-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-lg ${stockBadgeClasses}`}
              >
                {stockLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
