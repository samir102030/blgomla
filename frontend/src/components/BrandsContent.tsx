import React, { useEffect, useState } from "react";
import ProductFilterSidebar from "./ProductFilterSidebar";
import { useBrandStore } from "../stores/brand.store";
import ProductCard from "./ProductCard";
import { useProductStore } from "../stores/product.store";
import { useCategoryStore } from "../stores/category.store";

interface FilterState {
  categories: string[];
  subcategories: string[];
  brands: string[];
  minPrice: string;
  maxPrice: string;
  rating: string;
  search: string;
  featured: boolean;
  onSale: boolean;
}

const BrandsContent: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    subcategories: [],
    brands: [],
    minPrice: "",
    maxPrice: "",
    rating: "",
    search: "",
    featured: false,
    onSale: false,
  });
  const [sortBy, setSortBy] = useState<string>("name");

  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const products = useProductStore((state) => state.products);
  const loading = useProductStore((state) => state.loading);
  const error = useProductStore((state) => state.error);

  const fetchBrands = useBrandStore((state) => state.fetchBrands);
  const brands = useBrandStore((state) => state.brands);

  const fetchCategories = useCategoryStore((state) => state.fetchCategories);
  const categories = useCategoryStore((state) => state.categories);

  useEffect(() => {
    fetchBrands();
    fetchCategories();
    fetchProducts({ isActive: true, deleted: false, approvalStatus: "approved" });
  }, [fetchBrands, fetchCategories, fetchProducts]);

  // Helper function to get all subcategory IDs recursively
  const getAllSubcategoryIds = (
    categoryId: string,
    allCategories: any[]
  ): string[] => {
    const subcategories = allCategories.filter(
      (cat) => cat.parentCategory === categoryId
    );
    let ids = [categoryId];
    subcategories.forEach((sub) => {
      ids = ids.concat(getAllSubcategoryIds(sub._id, allCategories));
    });
    return ids;
  };

  // Apply filters
  const filteredProducts = products.filter((product) => {
    // Category filter (including subcategories)
    if (filters.categories.length > 0) {
      const selectedCategoryIds = filters.categories.flatMap((catId) =>
        getAllSubcategoryIds(catId, categories)
      );
      if (!selectedCategoryIds.includes(product.category || "")) {
        return false;
      }
    }

    // Brand filter
    if (
      filters.brands.length > 0 &&
      !filters.brands.includes(product.brand || "")
    ) {
      return false;
    }

    // Price filter
    const price =
      product.saleActive && product.salePrice
        ? product.salePrice
        : product.price;
    if (filters.minPrice && price < parseFloat(filters.minPrice)) {
      return false;
    }
    if (filters.maxPrice && price > parseFloat(filters.maxPrice)) {
      return false;
    }

    // Rating filter
    if (filters.rating && product.rating < parseFloat(filters.rating)) {
      return false;
    }

    // Featured filter
    if (filters.featured && !product.featured) {
      return false;
    }

    // On Sale filter
    if (filters.onSale && !product.saleActive) {
      return false;
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesName = product.name.toLowerCase().includes(searchTerm);
      const matchesDescription =
        product.description?.toLowerCase().includes(searchTerm) || false;
      if (!matchesName && !matchesDescription) {
        return false;
      }
    }

    return true;
  });

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

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
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
            <ProductFilterSidebar
              filters={filters}
              categories={categories}
              brands={brands}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Sort and Filter Bar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="text-gray-600">
                  Showing {sortedProducts.length} products
                  {filters.brands.length > 0 && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {filters.brands.length} brand
                      {filters.brands.length > 1 ? "s" : ""} selected
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
                    isFeatured={product.featured}
                    salePercentage={product.salePercentage}
                    stock={product.stock}
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
