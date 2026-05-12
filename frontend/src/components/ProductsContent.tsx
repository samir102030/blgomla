import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductFilterSidebar from "./ProductFilterSidebar";
import { useBrandStore } from "../stores/brand.store";
import ProductCard from "./ProductCard";
import { useProductStore } from "../stores/product.store";
import { useCategoryStore } from "../stores/category.store";
import { useTranslation } from "react-i18next";
import { getBaseUnitPrice } from "../lib/pricing";

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
  inStock: boolean;
}

const ProductsContent: React.FC = () => {
  const { t } = useTranslation();
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
    inStock: false,
  });
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const products = useProductStore((state) => state.products);
  const loading = useProductStore((state) => state.loading);
  const error = useProductStore((state) => state.error);

  const fetchBrands = useBrandStore((state) => state.fetchBrands);
  const brands = useBrandStore((state) => state.brands);

  const fetchCategories = useCategoryStore((state) => state.fetchCategories);
  const categories = useCategoryStore((state) => state.categories);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchBrands();
    fetchCategories();
    fetchProducts({ isActive: true, deleted: false, approvalStatus: "approved", limit: 1000 });
  }, [fetchBrands, fetchCategories, fetchProducts]);

  // Set search/category from URL params
  useEffect(() => {
    const searchQuery = searchParams.get("search");
    const categoryId = searchParams.get("category");
    const sale = searchParams.get("sale");
    const sort = searchParams.get("sort");
    if (searchQuery) {
      setFilters((prev) => ({ ...prev, search: searchQuery }));
    }
    if (categoryId) {
      setFilters((prev) => ({ ...prev, categories: [categoryId] }));
    }
    if (sale === "true") {
      setFilters((prev) => ({ ...prev, onSale: true }));
    }
    if (sort) {
      setSortBy(sort);
    }
  }, [searchParams]);

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
  const filteredProducts = products?.filter((product) => {
    if (filters.categories.length > 0) {
      const selectedCategoryIds = filters.categories.flatMap((catId) =>
        getAllSubcategoryIds(catId, categories)
      );
      const productCategoryId = typeof product.category === 'object' && product.category
        ? (product.category as any)._id
        : product.category;
      if (!selectedCategoryIds.includes(productCategoryId || "")) {
        return false;
      }
    }

    if (filters.brands.length > 0) {
      const productBrandId = typeof product.brand === 'object' && product.brand
        ? (product.brand as any)._id
        : product.brand;
      if (!filters.brands.includes(productBrandId || "")) {
        return false;
      }
    }

    const price = getBaseUnitPrice(product);
    if (filters.minPrice && price < parseFloat(filters.minPrice)) return false;
    if (filters.maxPrice && price > parseFloat(filters.maxPrice)) return false;
    if (filters.rating && product.rating < parseFloat(filters.rating)) return false;
    if (filters.featured && !product.featured) return false;
    if (filters.onSale && !product.saleActive) return false;
    if (filters.inStock && product.stock <= 0) return false;

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesName = product.name.toLowerCase().includes(searchTerm);
      const matchesDescription =
        product.description?.toLowerCase().includes(searchTerm) || false;
      if (!matchesName && !matchesDescription) return false;
    }

    return true;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return getBaseUnitPrice(a) - getBaseUnitPrice(b);
      case "price-high":
        return getBaseUnitPrice(b) - getBaseUnitPrice(a);
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
    setCurrentPage(1); // Reset to page 1 on filter change
  };

  const handleSearchChange = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] mb-1">
            {filters.search
              ? `${t("Search results for")} "${filters.search}"`
              : t("All Products")}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {filters.search
              ? `${totalProducts} ${t("products found")}`
              : t("Discover all products from our marketplace")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1 order-2 md:order-1">
            <div className="sticky top-24">
              <ProductFilterSidebar
                filters={filters}
                categories={categories}
                brands={brands}
                onFilterChange={handleFilterChange}
                onSearchChange={handleSearchChange}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3 order-1 md:order-2">
            {/* Search + Sort + View Mode Bar */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm">
              <div className="flex flex-col gap-3">
                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder={t("Search products...")}
                    value={filters.search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-xl bg-[var(--surface-2)] text-[var(--text)] placeholder:text-[var(--text-muted)]/50 focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] text-sm transition-all"
                  />
                </div>

                {/* Sort + View Mode + Count */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs text-[var(--text-muted)]">
                    {t("Showing")} <span className="font-semibold text-[var(--text)]">{Math.min(startIndex + 1, totalProducts)}–{Math.min(endIndex, totalProducts)}</span> {t("of")} <span className="font-semibold text-[var(--text)]">{totalProducts}</span> {t("products")}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
                    <div className="hidden sm:flex items-center bg-[var(--surface-2)] rounded-lg border border-[var(--border)] p-0.5">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Sort */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs bg-[var(--surface)] text-[var(--text)] focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] transition-all"
                    >
                      <option value="newest">{t("Newest First")}</option>
                      <option value="name">{t("Name A-Z")}</option>
                      <option value="price-low">{t("Price: Low → High")}</option>
                      <option value="price-high">{t("Price: High → Low")}</option>
                      <option value="rating">{t("Top Rated")}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5"
                : "flex flex-col gap-3"
            }>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 animate-pulse">
                    <div className="aspect-square bg-[var(--surface-2)] rounded-xl mb-3" />
                    <div className="h-4 bg-[var(--surface-2)] rounded w-3/4 mb-2" />
                    <div className="h-3 bg-[var(--surface-2)] rounded w-1/2 mb-3" />
                    <div className="h-5 bg-[var(--surface-2)] rounded w-1/3" />
                  </div>
                ))
              ) : error ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-4xl mb-3">⚠️</p>
                  <p className="text-[var(--text-muted)]">{error}</p>
                </div>
              ) : (
                currentProducts.map((product) => (
                  <ProductCard
                    key={product._id}
                    id={product._id!}
                    name={product.name}
                    price={getBaseUnitPrice(product)}
                    originalPrice={
                      product.saleActive ? product.price : undefined
                    }
                    image={product.images?.[0]?.url || ""}
                    rating={product.rating}
                    description={product?.description}
                    isOnSale={product.saleActive}
                    isFeatured={product.featured}
                    salePercentage={product.salePercentage}
                    stock={product.stock}
                    isInStock={product.stock > 0}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1.5 shadow-sm">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    ←
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                    )
                    .map((page, index, arr) => (
                      <React.Fragment key={page}>
                        {index > 0 && arr[index - 1] !== page - 1 && (
                          <span className="px-1 text-xs text-[var(--text-muted)]">…</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[36px] py-2 rounded-lg text-sm font-medium transition-all ${
                            currentPage === page
                              ? "bg-[var(--brand-primary)] text-white shadow-sm"
                              : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    →
                  </button>
                </div>
              </div>
            )}

            {/* No Products */}
            {totalProducts === 0 && !loading && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-bold text-[var(--text)] mb-2">
                  {t("No products found")}
                </h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  {t("Try adjusting your filters or search terms.")}
                </p>
                <button
                  onClick={() => handleFilterChange({
                    categories: [], subcategories: [], brands: [],
                    minPrice: "", maxPrice: "", rating: "", search: "",
                    featured: false, onSale: false, inStock: false,
                  })}
                  className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {t("Clear All Filters")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsContent;
