import React, { useState } from 'react';
import { Link } from 'react-router-dom';

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
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  currency = 'EGP',
  originalPrice,
  image,
  rating,
  description,
  isNew = false,
  isOnSale = false
}) => {
  const [isWishlisted, setIsWishlisted] = useState(false);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-lg ${i < Math.floor(rating) ? 'text-[#FFD600]' : 'text-[#9E9E9E]'}`}
      >
        ★
      </span>
    ));
  };

  const toggleWishlist = () => {
    setIsWishlisted(!isWishlisted);
  };

  return (
    <div className="bg-[#FAFAFA] rounded-lg p-6 relative border border-[#9E9E9E]/20">
      {/* Badges */}
      <div className="absolute top-4 left-4 flex flex-col gap-1 z-10">
        {isNew && (
          <span className="bg-[#009688] text-white px-2 py-1 text-xs font-medium rounded">
            New
          </span>
        )}
        {isOnSale && (
          <span className="bg-[#D32F2F] text-white px-2 py-1 text-xs font-medium rounded">
            Sale
          </span>
        )}
      </div>

      {/* Wishlist Button */}
      <button
        onClick={toggleWishlist}
        className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-[#FFD600]/20 hover:shadow-md transition-all duration-200"
      >
        <svg
          className={`w-6 h-6 ${isWishlisted ? 'text-[#D32F2F] fill-current' : 'text-[#9E9E9E]'}`}
          fill={isWishlisted ? 'currentColor' : 'none'}
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
      </button>

      {/* Product Image */}
      <div className="flex justify-center mb-6">
        <Link to={`/product/${id}`}>
          <img
            src={image}
            alt={name}
            className="w-48 h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
          />
        </Link>
      </div>

      {/* Product Info */}
      <div className="text-center mb-4">
        <h3 className="text-xl font-semibold text-[#333333] mb-2">{name}</h3>
        <div className="flex justify-center mb-3">
          {renderStars(rating)}
        </div>
        <p className="text-[#9E9E9E] text-sm leading-relaxed mb-4">
          {description}
        </p>
      </div>

      {/* Price */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl font-bold text-[#333333]">{price} {currency}</span>
          {originalPrice && (
            <span className="text-lg text-[#9E9E9E] line-through">{originalPrice} {currency}</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-3">
        {/* Quick View */}
        <button className="p-3 border border-[#9E9E9E]/30 rounded-full hover:bg-[#FFD600] hover:text-[#333333] hover:border-[#FFD600] hover:shadow-md transition-all duration-200">
          <svg className="w-5 h-5 text-[#9E9E9E] hover:text-[#333333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Add to Cart */}
        <button className="p-3 bg-[#FFD600] text-[#333333] rounded-full hover:bg-[#e6c100] hover:shadow-md transition-all duration-200 font-medium">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
          </svg>
        </button>

        {/* Compare */}
        <button className="p-3 border border-gray-300 rounded-full hover:bg-white hover:shadow-md transition-all duration-200">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
