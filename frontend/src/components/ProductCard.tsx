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
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, toggleLoveProduct, getLovedProducts } = useUserStore();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
        className={`text-lg ${
          i < Math.floor(rating) ? "text-[#FFD600]" : "text-[#9E9E9E]"
        }`}
      >
        ★
      </span>
    ));
  };

  const toggleWishlist = async () => {
    if (!user) {
      toast.error("Please login to add items to wishlist");
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
      const success = await toggleLoveProduct(id);
      if (success) {
        // Refresh the loved products to update the UI
        await getLovedProducts();
        toast.success(
          isWishlisted ? "Removed from wishlist" : "Added to wishlist"
        );
      } else {
        toast.error("Failed to update wishlist");
      }
    } catch {
      toast.error("Failed to update wishlist");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#FAFAFA] rounded-lg p-3 sm:p-4 lg:p-6 relative border border-[#9E9E9E]/20 flex flex-col h-full">
      {/* Badges */}
      <div className="absolute top-2 sm:top-3 lg:top-4 left-2 sm:left-3 lg:left-4 flex flex-col gap-0.5 sm:gap-1 z-10">
        {isFeatured && (
          <span className="bg-[#FF6B35] text-white px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded">
            {t("Featured")}
          </span>
        )}
        {isNew && (
          <span className="bg-[#009688] text-white px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded">
            {t("New")}
          </span>
        )}
        {isOnSale && salePercentage && (
          <span className="bg-[#D32F2F] text-white px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded">
            {salePercentage}{t("% OFF")}
          </span>
        )}
      </div>

      {/* Wishlist Button */}
      <button
        onClick={toggleWishlist}
        disabled={isLoading}
        className="absolute top-2 sm:top-3 lg:top-4 right-2 sm:right-3 lg:right-4 z-10 p-1 sm:p-2 rounded-full hover:bg-[#FFD600]/20 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6 text-[#9E9E9E] animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className={`w-5 h-5 sm:w-6 sm:h-6 ${
              isWishlisted ? "text-[#D32F2F] fill-current" : "text-[#9E9E9E]"
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
      <div className="flex justify-center mb-3 sm:mb-4 lg:mb-6 flex-grow">
        <Link to={`/product/${id}`}>
          <img
            src={image}
            alt={name}
            className="w-24 h-24 sm:w-32 sm:h-32 lg:w-48 lg:h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
          />
        </Link>
      </div>

      {/* Product Info */}
      <div className="text-center mb-2 sm:mb-4 flex-grow">
        <h3 className="text-sm sm:text-base lg:text-xl font-semibold text-[#333333] mb-1 sm:mb-2 line-clamp-2">
          {name}
        </h3>
        <div className="flex justify-center mb-1 sm:mb-3 gap-0.5 sm:gap-1">
          {renderStars(rating)}
        </div>
        <p className="text-[#9E9E9E] text-xs sm:text-sm leading-relaxed mb-2 sm:mb-4 line-clamp-2 hidden sm:block">
          {description}
        </p>
      </div>

      {/* Price */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
          <span className="text-lg sm:text-xl lg:text-2xl font-bold text-[#333333]">
            {price} {currency}
          </span>
          {originalPrice && (
            <span className="text-sm sm:text-base lg:text-lg text-[#9E9E9E] line-through">
              {originalPrice} {currency}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
