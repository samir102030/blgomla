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

const ProductsContent: React.FC = () => {
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

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  useEffect(() => {
    fetchBrands();
    fetchCategories();
    fetchProducts();
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
      if (!selectedCategoryIds.includes(product.Category || "")) {
        return false;
      }
    }

    // Subcategory filter (if categories have subcategories, but for now simple)
    // TODO: Implement subcategory filtering based on hierarchy

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
      case "price-low": {
        const priceA = a.saleActive && a.salePrice ? a.salePrice : a.price;
        const priceB = b.saleActive && b.salePrice ? b.salePrice : b.price;
        return priceA - priceB;
      }
      case "price-high": {
        const priceAHigh = a.saleActive && a.salePrice ? a.salePrice : a.price;
        const priceBHigh = b.saleActive && b.salePrice ? b.salePrice : b.price;
        return priceBHigh - priceAHigh;
      }
      case "rating":
        return b.rating - a.rating;
      case "newest":
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      case "name":
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Frontend pagination
  const totalProducts = sortedProducts.length;
  const totalPages = Math.ceil(totalProducts / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentProducts = sortedProducts.slice(startIndex, endIndex);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleSearchChange = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            All Products
          </h1>
          <p className="text-gray-600">
            Discover all products from our marketplace
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
              onSearchChange={handleSearchChange}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search and Sort Bar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={filters.search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">
                    Showing {startIndex + 1}-{Math.min(endIndex, totalProducts)}{" "}
                    of {totalProducts} products
                  </span>
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
                      <option value="newest">Newest</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  Loading...
                </div>
              ) : error ? (
                <div className="col-span-full text-center py-12 text-red-500">
                  {error}
                </div>
              ) : (
                currentProducts.map((product) => (
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
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 2
                    )
                    .map((page, index, arr) => (
                      <React.Fragment key={page}>
                        {index > 0 && arr[index - 1] !== page - 1 && (
                          <span className="px-2">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 border rounded-md ${
                            currentPage === page
                              ? "bg-blue-600 text-white border-blue-600"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* No Products Message */}
            {totalProducts === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No products found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your filters or search terms.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsContent;
