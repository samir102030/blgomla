import React, { useEffect, useMemo, useState } from "react";
import { TagIcon, StarIcon, CubeIcon } from "@heroicons/react/24/outline";
import type { Category } from "../types/category.type";
import type { Brand } from "../types/brand.type";
import { useTranslation } from "react-i18next";
import { getCategoryIcon } from "../lib/categoryIcon";

/** Parent id whether the field arrives populated or as a raw id. */
const parentIdOf = (c: Category): string | null => {
  const parent = c.parentCategory;
  if (!parent) return null;
  return typeof parent === "string" ? parent : parent._id || null;
};

interface CategoryNode extends Category {
  children: CategoryNode[];
}

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

interface FilterSidebarProps {
  filters: FilterState;
  categories: Category[];
  brands: Brand[];
  onFilterChange?: (filters: Partial<FilterState>) => void;
  onSearchChange?: (search: string) => void;
}

const ProductFilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  categories,
  brands,
  onFilterChange,
}) => {
  const { t, i18n } = useTranslation();
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    brand: true,
    price: true,
    rating: true,
    availability: true,
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev],
    }));
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.categories, categoryId]
      : filters.categories.filter((id) => id !== categoryId);
    onFilterChange?.({ categories: newCategories });
  };

  const handleBrandChange = (brandId: string, checked: boolean) => {
    const newBrands = checked
      ? [...filters.brands, brandId]
      : filters.brands.filter((id) => id !== brandId);
    onFilterChange?.({ brands: newBrands });
  };

  const handlePriceChange = (field: "minPrice" | "maxPrice", value: string) => {
    onFilterChange?.({ [field]: value });
  };

  const handleRatingChange = (rating: string) => {
    onFilterChange?.({ rating: filters.rating === rating ? "" : rating });
  };

  const clearFilters = () => {
    onFilterChange?.({
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
  };

  const activeFilterCount = [
    filters.categories.length > 0,
    filters.brands.length > 0,
    filters.minPrice || filters.maxPrice,
    filters.rating,
    filters.featured,
    filters.onSale,
    (filters as any).inStock,
  ].filter(Boolean).length;

  /**
   * The catalogue as a tree, however deep it goes.
   *
   * It used to be two flat passes — roots, then anything whose parent matched
   * — which stopped at the second level and compared `parentCategory` to an id
   * even when the API sent it populated, so on a populated response the
   * subcategories never matched at all.
   */
  const categoryTree = useMemo(() => {
    const nodes = new Map<string, CategoryNode>();
    for (const c of categories || []) {
      if (c.deleted || c.isActive === false) continue;
      nodes.set(c._id, { ...c, children: [] });
    }
    const roots: CategoryNode[] = [];
    for (const node of nodes.values()) {
      const parentId = parentIdOf(node);
      const parent = parentId ? nodes.get(parentId) : undefined;
      // A child whose parent is gone still belongs in the list, at the top —
      // this is a filter, and a category you cannot reach is one you cannot
      // filter by.
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    const sortDeep = (list: CategoryNode[]) => {
      list.sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)
      );
      list.forEach((n) => sortDeep(n.children));
    };
    sortDeep(roots);
    return roots;
  }, [categories]);

  // Which branches are open. Selection and expansion are separate: opening a
  // department to look inside it used to mean filtering by it first, so there
  // was no way to see the subcategories without changing the results.
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  // Arriving with a category already chosen — from the menu, or a shared link
  // — opens the branch it sits in, so the sidebar shows where the page is
  // rather than a collapsed list with a tick hidden somewhere inside it.
  useEffect(() => {
    if (!filters.categories.length || !categories?.length) return;
    const byId = new Map((categories || []).map((c) => [c._id, c]));
    setOpenCategories((prev) => {
      const next = new Set(prev);
      for (const selected of filters.categories) {
        let parentId = byId.get(selected) ? parentIdOf(byId.get(selected)!) : null;
        let guard = 0;
        while (parentId && guard++ < 10) {
          next.add(parentId);
          const parent = byId.get(parentId);
          parentId = parent ? parentIdOf(parent) : null;
        }
      }
      return next;
    });
  }, [filters.categories, categories]);

  const toggleCategoryOpen = (id: string) =>
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderCategoryNode = (node: CategoryNode, depth: number): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isOpen = openCategories.has(node._id);
    const isChecked = filters.categories.includes(node._id);

    return (
      <div key={node._id}>
        <div
          className="flex items-center gap-1"
          style={{ paddingInlineStart: `${depth * 0.85}rem` }}
        >
          <label className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-[var(--surface-2)]/60 cursor-pointer transition-colors flex-1 min-w-0">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => handleCategoryChange(node._id, e.target.checked)}
              className="w-4 h-4 shrink-0 rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/20"
            />
            {(() => {
              const Icon = getCategoryIcon(node.name);
              return <Icon className="w-4 h-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />;
            })()}
            <span
              className={`truncate ${
                depth === 0 ? "text-sm text-[var(--text)]" : "text-xs text-[var(--text-muted)]"
              } ${isChecked ? "font-semibold text-[var(--brand-primary)]" : ""}`}
            >
              {i18n.language === "ar" && node.nameAr ? node.nameAr : node.name}
            </span>
          </label>
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleCategoryOpen(node._id)}
              aria-expanded={isOpen}
              aria-label={node.name}
              className="w-6 h-6 shrink-0 flex items-center justify-center rounded text-[var(--text-subtle)] hover:bg-[var(--surface-2)]"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
        {hasChildren && isOpen && (
          <div className="border-l-2 border-[var(--brand-primary)]/15 ms-3">
            {node.children.map((child) => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const SectionToggle = ({ section, title, count }: { section: string; title: string; count?: number }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-3 text-left hover:bg-[var(--surface-2)]/50 rounded-lg transition-colors"
    >
      <h3 className="font-semibold text-sm text-[var(--text)]">
        {title}
        {count !== undefined && count > 0 && (
          <span className="ml-2 text-xs bg-[var(--brand-primary)] text-white px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </h3>
      <svg
        className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${
          expandedSections[section as keyof typeof expandedSections] ? "rotate-180" : ""
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  const filterContent = (
    <div className="space-y-1">
      {/* Header + Clear */}
      <div className="p-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-[var(--text)] flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {t("Filters")}
            {activeFilterCount > 0 && (
              <span className="text-xs bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-2 py-0.5 rounded-full font-medium">
                {activeFilterCount} {t("active")}
              </span>
            )}
          </h2>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="w-full bg-[var(--surface-2)] hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 border border-[var(--border)]"
          >
            ✕ {t("Clear All Filters")}
          </button>
        )}
      </div>

      {/* Quick Toggles */}
      <div className="p-3 border-b border-[var(--border)] space-y-2">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={filters.onSale}
              onChange={(e) => onFilterChange?.({ onSale: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[var(--surface-2)] rounded-full peer-checked:bg-[var(--brand-primary)] transition-colors border border-[var(--border)]" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
          </div>
          <span className="text-sm text-[var(--text)] group-hover:text-[var(--brand-primary)] transition-colors flex items-center gap-1.5">
            <TagIcon className="w-4 h-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
            {t("On Sale")}
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={filters.featured}
              onChange={(e) => onFilterChange?.({ featured: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[var(--surface-2)] rounded-full peer-checked:bg-[var(--brand-accent)] transition-colors border border-[var(--border)]" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
          </div>
          <span className="text-sm text-[var(--text)] group-hover:text-[var(--brand-accent)] transition-colors flex items-center gap-1.5">
            <StarIcon className="w-4 h-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
            {t("Featured")}
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={(filters as any).inStock || false}
              onChange={(e) => onFilterChange?.({ inStock: e.target.checked } as any)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[var(--surface-2)] rounded-full peer-checked:bg-green-500 transition-colors border border-[var(--border)]" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
          </div>
          <span className="text-sm text-[var(--text)] group-hover:text-green-500 transition-colors flex items-center gap-1.5">
            <CubeIcon className="w-4 h-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
            {t("In Stock Only")}
          </span>
        </label>
      </div>

      {/* Category */}
      <div className="border-b border-[var(--border)]">
        <SectionToggle section="category" title={t("Category")} count={filters.categories.length} />
        {expandedSections.category && (
          <div className="px-3 pb-3">
            <div className="space-y-0.5 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
              {categoryTree.map((node) => renderCategoryNode(node, 0))}
            </div>
          </div>
        )}
      </div>

      {/* Brand */}
      <div className="border-b border-[var(--border)]">
        <SectionToggle section="brand" title={t("Brand")} count={filters.brands.length} />
        {expandedSections.brand && (
          <div className="px-3 pb-3">
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
              {brands?.map((brand) => (
                <label
                  key={brand._id}
                  className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-[var(--surface-2)]/60 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.brands.includes(brand._id!)}
                    onChange={(e) => handleBrandChange(brand._id!, e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/20"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {brand.logo && (
                      <img loading="lazy" decoding="async" src={brand.logo} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} className="w-5 h-5 object-contain" />
                    )}
                    <span className="text-sm text-[var(--text)] truncate">{brand.name}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Price Range */}
      <div className="border-b border-[var(--border)]">
        <SectionToggle section="price" title={t("Price Range (EGP)")} />
        {expandedSections.price && (
          <div className="px-3 pb-3">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                placeholder={t("Min")}
                value={filters.minPrice}
                onChange={(e) => handlePriceChange("minPrice", e.target.value)}
                className="min-w-0 flex-1 px-2 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="shrink-0 text-[var(--text-muted)] text-sm">—</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder={t("Max")}
                value={filters.maxPrice}
                onChange={(e) => handlePriceChange("maxPrice", e.target.value)}
                className="min-w-0 flex-1 px-2 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            {/* Quick price presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { label: "< 5K", min: "", max: "5000" },
                { label: "5K-20K", min: "5000", max: "20000" },
                { label: "20K-50K", min: "20000", max: "50000" },
                { label: "50K+", min: "50000", max: "" },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => onFilterChange?.({ minPrice: preset.min, maxPrice: preset.max })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    filters.minPrice === preset.min && filters.maxPrice === preset.max
                      ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                      : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rating */}
      <div>
        <SectionToggle section="rating" title={t("Minimum Rating")} />
        {expandedSections.rating && (
          <div className="px-3 pb-3">
            <div className="space-y-1.5">
              {[4, 3, 2, 1].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleRatingChange(rating.toString())}
                  className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-lg transition-all text-left ${
                    filters.rating === rating.toString()
                      ? "bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30"
                      : "hover:bg-[var(--surface-2)]/60"
                  }`}
                >
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <svg
                        key={i}
                        className={`w-3.5 h-3.5 ${i < rating ? "text-yellow-400" : "text-[var(--text-muted)]/30"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">& {t("Up")}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        {t("Filters")}
        {activeFilterCount > 0 && (
          <span className="bg-[var(--brand-primary)] text-white text-xs px-1.5 py-0.5 rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Desktop Sidebar */}
      <div className="hidden md:block bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
        {filterContent}
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 sm:max-w-[90vw] bg-[var(--surface)] shadow-2xl flex flex-col">
            {/* Sticky close bar (filterContent has its own Filters heading) */}
            <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-end bg-[var(--surface)] flex-shrink-0">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
                aria-label={t("Close")}
              >
                <svg className="w-5 h-5 text-[var(--text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {filterContent}
            </div>

            {/* Sticky footer */}
            <div className="p-3 border-t border-[var(--border)] bg-[var(--surface)] flex gap-2 flex-shrink-0">
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    onFilterChange?.({
                      categories: [],
                      brands: [],
                      minPrice: "",
                      maxPrice: "",
                      rating: "",
                      featured: false,
                      onSale: false,
                      inStock: false,
                    });
                  }}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] text-sm font-medium hover:bg-[var(--surface-2)] transition-colors"
                >
                  {t("Clear")}
                </button>
              )}
              <button
                onClick={() => setMobileOpen(false)}
                className="flex-1 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white py-2.5 px-4 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[var(--brand-primary)]/25 transition-all duration-300"
              >
                {t("Show Results")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductFilterSidebar;
