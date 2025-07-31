import React, { useEffect, useState } from "react";
import BrandSidebar from "./BrandSidebar";
import { useBrandStore } from "../stores/brand.store";
import ProductCard from "./ProductCard";
import { useProductStore } from "../stores/product.store";

const BrandsContent: React.FC = () => {
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("name");
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const products = useProductStore((state) => state.products);
  const loading = useProductStore((state) => state.loading);
  const error = useProductStore((state) => state.error);
  const fetchBrands = useBrandStore((state) => state.fetchBrands);
  const brands = useBrandStore((state) => state.brands);

  useEffect(() => {
    fetchBrands();
    fetchProducts();
  }, [fetchBrands, fetchProducts]);

  // Filter by brand
  const filteredProducts = selectedBrand
    ? products.filter((product) => product.brand === selectedBrand)
    : products;

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "rating":
        return b.rating - a.rating;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrand(brandId);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Networking Brands
          </h1>
          <p className="text-gray-600">
            Discover networking equipment from top brands worldwide
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <BrandSidebar
              brands={brands}
              selectedBrand={selectedBrand}
              onBrandSelect={handleBrandSelect}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Sort and Filter Bar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="text-gray-600">
                  Showing {sortedProducts.length} products
                  {selectedBrand && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {/* {selectedBrand} */}
                      {
                        brands[brands.findIndex((b) => b._id === selectedBrand)]
                          .name
                      }
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="sort" className="text-sm text-gray-600">
                    Sort by:
                  </label>
                  <select
                    id="sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="name">Name</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Rating</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {loading ? (
                <div className="text-center py-12 text-gray-500">
                  Loading...
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-500">{error}</div>
              ) : (
                sortedProducts.map((product) => (
                  <ProductCard
                    key={product._id}
                    id={product._id!}
                    name={product.name}
                    price={
                      product.saleActive && product.salePrice !== undefined
                        ? product.salePrice
                        : product.price
                    }
                    originalPrice={
                      product.saleActive && product.salePrice !== undefined
                        ? product.price
                        : undefined
                    }
                    image={product.images?.[0]?.url || ""}
                    rating={product.rating}
                    description={product?.description}
                    isOnSale={product.saleActive}
                  />
                ))
              )}
            </div>

            {/* No Products Message */}
            {sortedProducts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📡</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No products found
                </h3>
                <p className="text-gray-600">
                  Try selecting a different brand or clear your selection.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandsContent;
