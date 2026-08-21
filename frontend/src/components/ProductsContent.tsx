import React, { useEffect, useMemo, useState } from "react";
import { ExclamationTriangleIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "react-router-dom";
import ProductFilterSidebar from "./ProductFilterSidebar";
import AdvertisementBanner from "./AdvertisementBanner";
import PageHero from "./PageHero";
import { useBrandStore } from "../stores/brand.store";
import ProductCard from "./ProductCard";
import { ProductCardSkeleton } from "./Skeleton";
import { useCategoryStore } from "../stores/category.store";
import { useTranslation } from "react-i18next";
import { getBaseUnitPrice } from "../lib/pricing";
import { axiosInstance } from "../lib/axios";

/** The sidebar's vocabulary for sorting, in the server's words. */
const SORT_PARAM: Record<string, string> = {
  "price-low": "price_asc",
  "price-high": "price_desc",
  rating: "top_rated",
  newest: "newest",
  name: "name_asc",
};

interface FilterState {
  categories: string[];
  brands: string[];
  minPrice: string;
  maxPrice: string;
  rating: string;
  search: string;
  featured: boolean;
  onSale: boolean;
  inStock: boolean;
}

const EMPTY_FILTERS: FilterState = {
  categories: [],
  brands: [],
  minPrice: "",
  maxPrice: "",
  rating: "",
  search: "",
  featured: false,
  onSale: false,
  inStock: false,
};

// Pick a string id whether the field is a populated object or a raw id.
const idOf = (field: any): string => {
  if (!field) return "";
  if (typeof field === "object") return field._id || "";
  return String(field);
};

// Recursively collect a category and all its descendants. Visited-set
// prevents infinite loops if the DB has a parent-child cycle.
//
// The parent comparison goes through idOf: the categories endpoint populates
// `parentCategory`, so matching it against a raw id found nothing and picking
// a department showed only the products filed directly on it — which, in a
// tree three levels deep, is usually none.
const collectCategoryIds = (
  rootId: string,
  all: any[],
  visited = new Set<string>()
): string[] => {
  if (visited.has(rootId)) return [];
  visited.add(rootId);
  const children = all.filter((c) => idOf(c.parentCategory) === rootId);
  return [rootId, ...children.flatMap((c) => collectCategoryIds(c._id, all, visited))];
};

/**
 * Categories and brands travel as a comma-separated list.
 *
 * They used to travel as `category=<first id>`, which quietly made the whole
 * filter single-select: the sidebar held an array and offered checkboxes, the
 * page filtered on the array — and then every change round-tripped through a
 * URL that could only carry one, so ticking a second box wrote the first back
 * over it. The controls looked multi-select and behaved single-select.
 */
const listParam = (value: string | null) =>
  (value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

/** The canonical query string for a set of filters — one direction of the URL sync. */
const toQuery = (filters: FilterState, sortBy: string) => {
  const next = new URLSearchParams();
  if (filters.categories.length) next.set("category", filters.categories.join(","));
  if (filters.brands.length) next.set("brand", filters.brands.join(","));
  if (filters.minPrice) next.set("min", filters.minPrice);
  if (filters.maxPrice) next.set("max", filters.maxPrice);
  if (filters.rating) next.set("rating", filters.rating);
  if (filters.search) next.set("search", filters.search);
  if (filters.onSale) next.set("sale", "true");
  if (filters.inStock) next.set("inStock", "true");
  if (filters.featured) next.set("featured", "true");
  if (sortBy && sortBy !== "newest") next.set("sort", sortBy);
  return next;
};

/** …and the other. Reading and writing stay symmetrical so they can be compared. */
const fromQuery = (params: URLSearchParams) => ({
  filters: {
    ...EMPTY_FILTERS,
    // A single id still reads correctly, so every link already out there —
    // the menu, the banner slides, anything a customer bookmarked or shared —
    // keeps working.
    categories: listParam(params.get("category")),
    brands: listParam(params.get("brand")),
    minPrice: params.get("min") || "",
    maxPrice: params.get("max") || "",
    rating: params.get("rating") || "",
    search: params.get("search") || "",
    onSale: params.get("sale") === "true",
    inStock: params.get("inStock") === "true",
    featured: params.get("featured") === "true",
  } as FilterState,
  sortBy: params.get("sort") || "newest",
});

const ProductsContent: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  /**
   * The filters are the URL — not a copy of it.
   *
   * They used to be state, seeded from the query string at mount and written
   * back to it on every change. That works until something else changes the
   * URL: picking a category from the top menu while already on this page
   * navigates to /products?category=<new one>, the mounted page kept its old
   * selection, and the write-back effect put the old value straight back. The
   * bar changed, the products didn't, and the address flicked back. Reading
   * straight from the query string leaves nothing to disagree with.
   */
  const { filters, sortBy } = useMemo(
    () => fromQuery(searchParams),
    [searchParams]
  );

  /** Every filter change is a URL change. Replace, so filtering doesn't fill history. */
  const write = (nextFilters: FilterState, nextSort: string) => {
    setSearchParams(toQuery(nextFilters, nextSort), { replace: true });
  };
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const [rows, setRows] = useState<any[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const fetchBrands = useBrandStore((state) => state.fetchBrands);
  const brands = useBrandStore((state) => state.brands);

  const fetchCategories = useCategoryStore((state) => state.fetchCategories);
  const categories = useCategoryStore((state) => state.categories);

  useEffect(() => {
    fetchBrands();
    fetchCategories();
  }, [fetchBrands, fetchCategories]);

  // Any change to the filters — from the sidebar or from the menu upstairs —
  // starts the results again from the first page.
  const query = searchParams.toString();
  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  // Build category-name lookup once so search can match by category name.
  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    (categories || []).forEach((c: any) => m.set(c._id, c.name));
    return m;
  }, [categories]);

  const brandNameById = useMemo(() => {
    const m = new Map<string, string>();
    (brands || []).forEach((b: any) => m.set(b._id, b.name));
    return m;
  }, [brands]);

  /**
   * The catalogue arrives a page at a time.
   *
   * It used to arrive whole: one request for a thousand products, then
   * filtered, sorted and paged in the browser. That broke twice over once the
   * shop grew past a thousand — the rest of the catalogue was simply
   * unreachable, and the store wrote what it held into localStorage, where a
   * thousand product documents overflow the quota and the page rendered the
   * exception where the products should have been.
   *
   * Every control in the sidebar is a query parameter now, so the server
   * returns the page that was asked for and the count of everything that
   * matched it. The one thing that changes for a customer: search is the
   * server's, which matches every word against name, Arabic name and tags,
   * rather than a substring of the fields that happened to be loaded.
   */
  useEffect(() => {
    let cancelled = false;

    const params: Record<string, string | number> = {
      page: currentPage,
      limit: pageSize,
      sortBy: SORT_PARAM[sortBy] ?? "newest",
    };
    if (filters.categories.length) params.category = filters.categories.join(",");
    if (filters.brands.length) params.brand = filters.brands.join(",");
    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (filters.rating) params.rating = filters.rating;
    if (filters.inStock) params.inStock = "true";
    if (filters.onSale) params.onSale = "true";
    if (filters.featured) params.featured = "true";

    setLoading(true);
    setError(undefined);

    axiosInstance
      .get("/products/storefront", { params })
      .then(({ data }: any) => {
        if (cancelled) return;
        setRows(data.data || []);
        setTotalProducts(data.total ?? 0);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setRows([]);
        setTotalProducts(0);
        setError(err?.response?.data?.message || err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // `query` is the whole filter state and the sort, both of which live in the
    // address bar. Depending on it rather than on the objects derived from it
    // keeps this from re-firing on every render.
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, currentPage]);

  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + rows.length;
  const currentProducts = rows;

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    write({ ...filters, ...newFilters }, sortBy);
  };

  const handleSearchChange = (search: string) => {
    write({ ...filters, search }, sortBy);
  };

  const handleSortChange = (s: string) => {
    write(filters, s);
  };

  const clearAll = () => {
    write(EMPTY_FILTERS, "newest");
  };

  // Active-filter chips data
  const activeChips: Array<{ label: string; onRemove: () => void }> = [];
  filters.categories.forEach((id) => {
    const name = categoryNameById.get(id) || "Category";
    activeChips.push({
      label: name,
      onRemove: () =>
        handleFilterChange({
          categories: filters.categories.filter((c) => c !== id),
        }),
    });
  });
  filters.brands.forEach((id) => {
    const name = brandNameById.get(id) || "Brand";
    activeChips.push({
      label: name,
      onRemove: () =>
        handleFilterChange({ brands: filters.brands.filter((b) => b !== id) }),
    });
  });
  if (filters.minPrice || filters.maxPrice) {
    activeChips.push({
      label: `${filters.minPrice || "0"} – ${filters.maxPrice || "∞"} EGP`,
      onRemove: () => handleFilterChange({ minPrice: "", maxPrice: "" }),
    });
  }
  if (filters.rating) {
    activeChips.push({
      label: `${filters.rating}+ stars`,
      onRemove: () => handleFilterChange({ rating: "" }),
    });
  }
  if (filters.onSale) activeChips.push({ label: t("On Sale"), onRemove: () => handleFilterChange({ onSale: false }) });
  if (filters.featured) activeChips.push({ label: t("Featured"), onRemove: () => handleFilterChange({ featured: false }) });
  if (filters.inStock) activeChips.push({ label: t("In Stock"), onRemove: () => handleFilterChange({ inStock: false }) });

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PageHero
        eyebrow={t("Catalog")}
        title={
          filters.search
            ? `${t("Search results for")} "${filters.search}"`
            : t("All Products")
        }
        subtitle={
          filters.search
            ? undefined
            : t("Discover all products from our marketplace")
        }
        breadcrumb={[
          { label: t("Home"), to: "/" },
          { label: t("All Products") },
        ]}
        aside={
          <div className="text-start lg:text-end">
            <div className="text-display-sm text-[var(--on-ink)]">
              {totalProducts.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-[var(--on-ink-muted)]">
              {t("products found")}
            </div>
          </div>
        }
      />

      <div className="shell pb-10 sm:pb-14">
        {/* Top promo strip */}
        <div className="pt-6 sm:pt-8">
          <AdvertisementBanner position="category-strip" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar — appears above products on mobile (filter trigger),
              left-rail on desktop. */}
          <div className="md:col-span-1">
            <div className="sticky top-24">
              <ProductFilterSidebar
                filters={{ ...filters, subcategories: [] }}
                categories={categories}
                brands={brands}
                onFilterChange={handleFilterChange}
                onSearchChange={handleSearchChange}
              />
              <div className="hidden md:block mt-4">
                <AdvertisementBanner position="sidebar" />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            {/* Search + Sort + View Mode Bar */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm">
              <div className="flex flex-col gap-3">
                {/* Search */}
                <div className="relative">
                  {/* Logical insets: pinned with left/right, the icon sat on
                      top of the caret once the page flipped to Arabic. */}
                  <svg className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder={t("Search products...")}
                    value={filters.search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4 py-2.5 border border-[var(--border)] rounded-xl bg-[var(--surface-2)] text-[var(--text)] placeholder:text-[var(--text-muted)]/50 focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] text-sm transition-all"
                  />
                </div>

                {/* Sort + View Mode + Count */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs text-[var(--text-muted)]">
                    {totalProducts > 0
                      ? <>{t("Showing")} <span className="font-semibold text-[var(--text)]">{startIndex + 1}–{endIndex}</span> {t("of")} <span className="font-semibold text-[var(--text)]">{totalProducts}</span> {t("products")}</>
                      : <>{t("Showing")} <span className="font-semibold text-[var(--text)]">0</span> {t("of")} <span className="font-semibold text-[var(--text)]">0</span> {t("products")}</>
                    }
                  </span>

                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center bg-[var(--surface-2)] rounded-lg border border-[var(--border)] p-0.5">
                      <button
                        onClick={() => setViewMode("grid")}
                        aria-label={t("Grid view")}
                        className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        aria-label={t("List view")}
                        className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                    </div>

                    <select
                      value={sortBy}
                      onChange={(e) => handleSortChange(e.target.value)}
                      aria-label={t("Sort by")}
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

                {/* Active filter chips */}
                {activeChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {activeChips.map((chip, i) => (
                      <button
                        key={i}
                        onClick={chip.onRemove}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-medium hover:bg-[var(--brand-primary)]/20 transition-colors"
                      >
                        {chip.label}
                        <span aria-hidden="true">×</span>
                      </button>
                    ))}
                    <button
                      onClick={clearAll}
                      className="ml-1 text-xs text-[var(--text-muted)] underline hover:text-[var(--text)]"
                    >
                      {t("Clear all")}
                    </button>
                  </div>
                )}
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
                  <ProductCardSkeleton key={i} />
                ))
              ) : error ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-4xl mb-3"><ExclamationTriangleIcon className="w-9 h-9" aria-hidden="true" /></p>
                  <p className="text-[var(--text-muted)]">{error}</p>
                </div>
              ) : (
                currentProducts.map((product: any) => (
                  <ProductCard
                    key={product._id}
                    id={product._id!}
                    name={product.name}
                    nameAr={product.nameAr}
                    price={getBaseUnitPrice(product)}
                    originalPrice={product.saleActive ? product.price : undefined}
                    image={product.images?.[0]?.url || ""}
                    rating={product.rating}
                    description={product?.description}
                    isOnSale={product.saleActive}
                    isFeatured={product.featured}
                    salePercentage={product.salePercentage}
                    stock={product.stock}
                    soldCount={product.soldCount}
                    isInStock={product.stock > 0}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && totalProducts > 0 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1.5 shadow-sm">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    aria-label={t("Previous page")}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    ←
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, index, arr) => (
                      <React.Fragment key={page}>
                        {index > 0 && arr[index - 1] !== page - 1 && (
                          <span className="px-1 text-xs text-[var(--text-muted)]">…</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          aria-current={currentPage === page ? "page" : undefined}
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
                    aria-label={t("Next page")}
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
                <div className="text-6xl mb-4"><MagnifyingGlassIcon className="w-9 h-9" aria-hidden="true" /></div>
                <h3 className="text-lg font-bold text-[var(--text)] mb-2">
                  {t("No products found")}
                </h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  {t("Try adjusting your filters or search terms.")}
                </p>
                <button
                  onClick={clearAll}
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
