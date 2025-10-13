import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useBrandStore } from "../stores/brand.store";

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
  const [selectedImage, setSelectedImage] = useState(0);
  const brands = useBrandStore((state: any) => state.brands);

  useEffect(() => {
    if (isOpen && product?.images?.length > 0) {
      setSelectedImage(0);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const productImages =
    product.images && product.images.length > 0
      ? product.images.map((img: any) => img.url)
      : ["/placeholder.png"];

  const getBrandName = (brandId: string) => {
    const brand = brands.find((b: any) => b._id === brandId);
    return brand ? brand.name : brandId;
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

  const stockStatus = getStockStatus(product.stock || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Product Details
            </h2>
            <p className="text-gray-600 text-sm">
              View complete product information
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Product Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden shadow-lg">
                <img
                  src={productImages[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-contain p-4"
                />
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
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-contain p-1"
                      />
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
                  {product.name}
                </h3>

                {/* Rating */}
                {product.rating && (
                  <div className="flex items-center mb-4">
                    <div className="flex items-center mr-3">
                      {renderStars(Math.floor(product.rating))}
                    </div>
                    <span className="text-gray-600 text-sm">
                      ({product.reviews?.length || 0} reviews)
                    </span>
                  </div>
                )}

                {/* Price */}
                <div className="mb-4">
                  {product.saleActive &&
                  product.salePercentage &&
                  product.salePercentage > 0 ? (
                    <div className="flex items-center space-x-3">
                      <span className="text-4xl font-bold text-gray-900">
                        $
                        {product.salePrice?.toFixed(2) ||
                          (
                            product.price *
                            (1 - product.salePercentage / 100)
                          ).toFixed(2)}
                      </span>
                      <span className="text-2xl text-gray-500 line-through">
                        ${product.price?.toFixed(2)}
                      </span>
                      <span className="bg-red-100 text-red-800 text-sm font-semibold px-3 py-1 rounded-full">
                        -{product.salePercentage}% OFF
                      </span>
                    </div>
                  ) : (
                    <span className="text-4xl font-bold text-gray-900">
                      ${product.price?.toFixed(2)}
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
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">SKU</div>
                  <div className="font-semibold text-gray-900">
                    {product._id?.slice(-8).toUpperCase()}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Brand</div>
                  <div className="font-semibold text-gray-900">
                    {product.brand ? getBrandName(product.brand) : "N/A"}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Category</div>
                  <div className="font-semibold text-gray-900">
                    {product.Category || "N/A"}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Sold Count</div>
                  <div className="font-semibold text-gray-900">
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
                  <p className="text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag: string, index: number) => (
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
              {product.features && product.features.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Features
                  </h4>
                  <ul className="space-y-2">
                    {product.features.map((feature: string, index: number) => (
                      <li
                        key={index}
                        className="flex items-center text-gray-700"
                      >
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Attributes */}
              {product.attributes && product.attributes.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Specifications
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {product.attributes.map((attr: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-3"
                      >
                        <span className="font-medium text-gray-700">
                          {attr.name}:
                        </span>
                        <span className="text-gray-900">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews Summary */}
              {product.reviews && product.reviews.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Recent Reviews
                  </h4>
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {product.reviews
                      .slice(0, 3)
                      .map((review: any, index: number) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <img
                                src={
                                  review.user?.profilePicture ||
                                  "/placeholder.png"
                                }
                                alt={review.user?.name || "User"}
                                className="w-8 h-8 rounded-full mr-3"
                              />
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
                    {product.reviews.length > 3 && (
                      <div className="text-center text-gray-500 text-sm">
                        And {product.reviews.length - 3} more reviews...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-8 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;
