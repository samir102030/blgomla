import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { useBrandStore } from "../stores/brand.store";
import { useMoney } from "../lib/money";

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { t, i18n } = useTranslation();
  const money = useMoney();
  const [selectedImage, setSelectedImage] = useState(0);
  const brands = useBrandStore((state: any) => state.brands);

  const price = Number(product?.price) || 0;
  const salePercentage = Number(product?.salePercentage) || 0;
  const salePriceValue =
    product?.salePrice !== undefined && product?.salePrice !== null
      ? Number(product.salePrice)
      : undefined;
  const effectiveSalePrice =
    salePercentage > 0
      ? isFinite(salePriceValue || NaN)
        ? salePriceValue
        : price * (1 - salePercentage / 100)
      : undefined;
  const rating = Number(product?.rating) || 0;
  const stockValue = Number(product?.stock) || 0;
  const safeReviews = Array.isArray(product?.reviews)
    ? product.reviews.filter((r: any) => r?.isVisible !== false)
    : [];
  const safeTags = Array.isArray(product?.tags) ? product.tags : [];
  const safeFeatures = Array.isArray(product?.features) ? product.features : [];
  const safeAttributes = Array.isArray(product?.attributes)
    ? product.attributes
    : [];
  const safeImages = Array.isArray(product?.images) ? product.images : [];

  useEffect(() => {
    if (isOpen && product?.images?.length > 0) {
      setSelectedImage(0);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const productImages =
    safeImages.length > 0
      ? safeImages
          .map((img: any) => (typeof img === "string" ? img : img?.url))
          .filter(Boolean)
      : [];

  const getLocalizedText = (value: any) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    if (typeof value === "object") {
      const lang = i18n.language;
      if (value[lang]) return getLocalizedText(value[lang]);
      if (value.en) return getLocalizedText(value.en);
      if (value.ar) return getLocalizedText(value.ar);
      if (value.name) return getLocalizedText(value.name);
      if (value.title) return getLocalizedText(value.title);
    }
    return "";
  };

  const getBrandName = (brandValue: any) => {
    const brandId =
      typeof brandValue === "string" ? brandValue : brandValue?._id;
    const brand = brands?.find((b: any) => b._id === brandId);
    return getLocalizedText(brand?.name || brandValue || "N/A");
  };

  const getCategoryName = (categoryValue: any) => {
    if (!categoryValue) return "N/A";
    if (typeof categoryValue === "string") return categoryValue;
    return getLocalizedText(categoryValue?.name || categoryValue);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-lg ${
          i < rating ? "text-yellow-400" : "text-gray-300"
        }`}
      >
        ★
      </span>
    ));
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0)
      return { text: "Out of Stock", color: "text-red-600", bg: "bg-red-50" };
    if (stock < 30)
      return {
        text: `Low Stock (${stock})`,
        color: "text-yellow-600",
        bg: "bg-yellow-50",
      };
    return { text: "In Stock", color: "text-green-600", bg: "bg-green-50" };
  };

  const stockStatus = getStockStatus(stockValue);

  const formatSku = (id: any) =>
    typeof id === "string" ? id.slice(-8).toUpperCase() : "N/A";

  const productName = getLocalizedText(product?.name) || "N/A";
  const productDescription = getLocalizedText(product?.description);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-100 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-1">
              Product Details
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              View complete product information
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 rounded-full transition-colors duration-200"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)] bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Product Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="aspect-square bg-gray-50 dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-slate-800 flex items-center justify-center">
                {productImages[selectedImage] ? (
                  <img
                    src={productImages[selectedImage]}
                    alt={productName}
                    className="w-full h-full object-contain p-4"
                   loading="lazy" decoding="async"/>
                ) : (
                  <div className="text-gray-400 dark:text-gray-600 flex flex-col items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-16 w-16"
                    >
                      <path d="M6.75 4.5a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 6.75 19.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 17.25 4.5H6.75Zm0-1.5h10.5A3.75 3.75 0 0 1 21 6.75v10.5A3.75 3.75 0 0 1 17.25 21H6.75A3.75 3.75 0 0 1 3 17.25V6.75A3.75 3.75 0 0 1 6.75 3Z" />
                      <path d="M8.25 9a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0ZM6.75 16.5l2.75-3.667a1.125 1.125 0 0 1 1.8-.038l1.443 1.805l1.358-1.812a1.125 1.125 0 0 1 1.836.037L17.25 16.5H6.75Z" />
                    </svg>
                    <span className="text-sm">No image</span>
                  </div>
                )}
              </div>

              {/* Thumbnail Images */}
              {productImages.length > 1 && (
                <div className="flex space-x-3 overflow-x-auto pb-2">
                  {productImages.map((image: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`flex-shrink-0 w-16 h-16 bg-gray-50 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                        selectedImage === index
                          ? "border-blue-500 shadow-md scale-105"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${productName} ${index + 1}`}
                        className="w-full h-full object-contain p-1"
                       loading="lazy" decoding="async"/>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Information */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {productName}
                </h3>

                {/* Rating */}
                {rating > 0 && (
                  <div className="flex items-center mb-4">
                    <div className="flex items-center mr-3">
                      {renderStars(Math.floor(rating))}
                    </div>
                    <span className="text-gray-600 text-sm">
                      ({safeReviews.length || 0} reviews)
                    </span>
                  </div>
                )}

                {/* Price */}
                <div className="mb-4">
                  {product.saleActive && salePercentage > 0 ? (
                    <div className="flex items-center space-x-3">
                    <span className="text-4xl font-bold text-gray-900 dark:text-gray-50">
                      {money(effectiveSalePrice ?? price)}
                    </span>
                    <span className="text-2xl text-gray-500 dark:text-gray-400 line-through">
                      {money(price)}
                    </span>
                    <span className="bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-200 text-sm font-semibold px-3 py-1 rounded-full">
                      -{salePercentage}% {t("OFF")}
                    </span>
                  </div>
                ) : (
                  <span className="text-4xl font-bold text-gray-900 dark:text-gray-50">
                    {money(price)}
                  </span>
                )}
              </div>

                {/* Stock Status */}
                <div
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${stockStatus.bg} ${stockStatus.color}`}
                >
                  <span className="w-2 h-2 bg-current rounded-full mr-2"></span>
                  {stockStatus.text}
                </div>
              </div>

              {/* Product Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-300 mb-1">SKU</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-50">
                    {formatSku(product?._id)}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-300 mb-1">Brand</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-50">
                    {product.brand ? getBrandName(product.brand) : "N/A"}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-300 mb-1">Category</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-50">
                    {getCategoryName(product.category)}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-300 mb-1">Sold Count</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-50">
                    {product.soldCount || 0}
                  </div>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                {product.isActive && (
                  <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                    Active
                  </span>
                )}
                {product.featured && (
                  <span className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">
                    Featured
                  </span>
                )}
                {product.saleActive && (
                  <span className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">
                    On Sale
                  </span>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Description
                  </h4>
                  <p className="text-gray-700 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                    {productDescription}
                  </p>
                </div>
              )}

              {/* Tags */}
              {safeTags.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {safeTags
                      .map((tag: any) => getLocalizedText(tag))
                      .filter(Boolean)
                      .map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Features */}
              {safeFeatures.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Features
                  </h4>
                  <ul className="space-y-2">
                    {safeFeatures
                      .map((feature: any) => getLocalizedText(feature))
                      .filter(Boolean)
                      .map((feature: string, index: number) => (
                        <li
                          key={index}
                          className="flex items-center text-gray-700 dark:text-gray-200"
                        >
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></span>
                          {feature}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Attributes */}
              {safeAttributes.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Specifications
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {safeAttributes.map((attr: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-gray-50 dark:bg-slate-800 rounded-lg px-4 py-3"
                      >
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          {getLocalizedText(attr?.name)}:
                        </span>
                        <span className="text-gray-900 dark:text-gray-50">
                          {getLocalizedText(attr?.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews Summary */}
              {safeReviews.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Recent Reviews
                  </h4>
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {safeReviews
                      .slice(0, 3)
                      .map((review: any, index: number) => (
                        <div key={index} className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <img
                                src={
                                  review.user?.profilePicture ||
                                  "/placeholder.png"
                                }
                                alt={review.user?.name || "User"}
                                className="w-8 h-8 rounded-full mr-3"
                               loading="lazy" decoding="async"/>
                              <span className="font-medium text-gray-900 text-sm">
                                {review.user?.name || "Anonymous"}
                              </span>
                            </div>
                            <div className="flex items-center">
                              {renderStars(review.rating)}
                            </div>
                          </div>
                          <p className="text-gray-700 text-sm">
                            {review.comment}
                          </p>
                        </div>
                      ))}
                    {safeReviews.length > 3 && (
                      <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
                        And {safeReviews.length - 3} more reviews...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-8 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors duration-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;
