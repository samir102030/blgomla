import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Category } from "../../types/category.type";
import type { Brand } from "../../types/brand.type";
import {
  countActiveFilters,
  parentIdOf,
  type AdminProductFilterState,
} from "./productFilters";

interface CategoryNode extends Category {
  children: CategoryNode[];
}

/**
 * Declared at module scope, not inside the panel.
 *
 * A component defined in a render body is a new type on every render, so React
 * unmounts and remounts its whole subtree — which for a section wrapping a text
 * input means the input is destroyed after each keystroke and the caret jumps
 * out of it.
 */
const Section: React.FC<{
  title: string;
  count?: number;
  children: React.ReactNode;
}> = ({ title, count, children }) => (
  <div className="border-b border-gray-100 last:border-b-0 px-4 py-3">
    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-2">
      {title}
      {count !== undefined && count > 0 && (
        <span className="bg-[var(--brand-primary)] text-white px-1.5 py-0.5 rounded-full text-[10px]">
          {count}
        </span>
      )}
    </h3>
    {children}
  </div>
);

interface Props {
  value: AdminProductFilterState;
  onChange: (next: Partial<AdminProductFilterState>) => void;
  onClear: () => void;
  categories: Category[];
  brands: Brand[];
  vendors: Array<{ _id: string; name?: string; storeName?: string }>;
  /** Brand ids that occur under the selected categories; empty = no narrowing. */
  scopedBrandIds: string[] | null;
  /** Gates the bulk "select all" affordances. */
  isAdmin: boolean;
  /** Select every product matching the current filter, across all pages. */
  onSelectAllProducts: () => void;
  selectedProductCount: number;
  totalProductCount: number;
  selectingAll: boolean;
  onClearSelection: () => void;
}

const AdminProductFilters: React.FC<Props> = ({
  value,
  onChange,
  onClear,
  categories,
  brands,
  vendors,
  scopedBrandIds,
  isAdmin,
  onSelectAllProducts,
  selectedProductCount,
  totalProductCount,
  selectingAll,
  onClearSelection,
}) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const label = (c: { name?: string; nameAr?: string }) =>
    (isAr && c.nameAr ? c.nameAr : c.name) || "";

  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [categorySearch, setCategorySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");

  /** The catalogue as a tree, however deep it goes. */
  const { tree, byId, descendantsOf } = useMemo(() => {
    const nodes = new Map<string, CategoryNode>();
    for (const c of categories || []) {
      if (c.deleted) continue;
      nodes.set(c._id, { ...c, children: [] });
    }
    const roots: CategoryNode[] = [];
    for (const node of nodes.values()) {
      const parentId = parentIdOf(node);
      const parent = parentId ? nodes.get(parentId) : undefined;
      // A child whose parent is missing still belongs in the list, at the top:
      // a category you cannot reach is one you cannot filter by.
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

    // id → itself plus every descendant, so ticking a parent can tick the
    // branch under it in one go.
    const descendants = new Map<string, string[]>();
    const collect = (node: CategoryNode): string[] => {
      const ids = [node._id, ...node.children.flatMap(collect)];
      descendants.set(node._id, ids);
      return ids;
    };
    roots.forEach(collect);

    return { tree: roots, byId: nodes, descendantsOf: descendants };
  }, [categories]);

  // Arriving with a category already chosen opens the branch it sits in, so the
  // panel shows where the list is rather than a collapsed tree with a tick
  // hidden somewhere inside it.
  useEffect(() => {
    if (!value.categoryIds.length) return;
    setOpenCategories((prev) => {
      const next = new Set(prev);
      for (const selected of value.categoryIds) {
        let parentId = byId.get(selected) ? parentIdOf(byId.get(selected)!) : null;
        let guard = 0;
        while (parentId && guard++ < 10) {
          next.add(parentId);
          parentId = byId.get(parentId) ? parentIdOf(byId.get(parentId)!) : null;
        }
      }
      return next;
    });
  }, [value.categoryIds, byId]);

  // Typing in the category box is only useful if it can reach a subcategory, so
  // a match opens every branch above it.
  const matchedCategoryIds = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    if (!term) return null;
    const hits = new Set<string>();
    for (const node of byId.values()) {
      const haystack = `${node.name} ${node.nameAr || ""} ${node.slug || ""}`.toLowerCase();
      if (!haystack.includes(term)) continue;
      hits.add(node._id);
      let parentId = parentIdOf(node);
      let guard = 0;
      while (parentId && guard++ < 10) {
        hits.add(parentId);
        parentId = byId.get(parentId) ? parentIdOf(byId.get(parentId)!) : null;
      }
    }
    return hits;
  }, [categorySearch, byId]);

  const toggleOpen = (id: string) =>
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /**
   * Ticking a category takes its subcategories with it.
   *
   * The backend already matches a category's whole subtree, so the extra ids
   * change no results — they make the panel honest about what the filter
   * covers, and let a single child be unticked afterwards.
   */
  const toggleCategory = (id: string, checked: boolean) => {
    const branch = descendantsOf.get(id) || [id];
    const next = new Set(value.categoryIds);
    for (const b of branch) {
      if (checked) next.add(b);
      else next.delete(b);
    }
    onChange({ categoryIds: [...next] });
  };

  const allCategoryIds = useMemo(() => [...byId.keys()], [byId]);
  const allSelected =
    allCategoryIds.length > 0 && value.categoryIds.length === allCategoryIds.length;

  const toggleBrand = (id: string, checked: boolean) => {
    const next = checked
      ? [...value.brandIds, id]
      : value.brandIds.filter((b) => b !== id);
    onChange({ brandIds: next });
  };

  /**
   * Brands narrowed to the selected categories.
   *
   * `scopedBrandIds` is null when nothing is selected — every brand shows. When
   * a selection yields no brands the full list is shown instead of an empty
   * panel: a filter that offers nothing reads as broken, and the honest message
   * is "nothing here yet", not a blank box.
   */
  const { visibleBrands, brandsAreScoped } = useMemo(() => {
    const term = brandSearch.trim().toLowerCase();
    const bySearch = (b: Brand) =>
      !term || `${b.name} ${b.nameAr || ""}`.toLowerCase().includes(term);

    const all = (brands || []).filter(bySearch);
    if (!scopedBrandIds || scopedBrandIds.length === 0) {
      return { visibleBrands: all, brandsAreScoped: false };
    }
    const allowed = new Set(scopedBrandIds);
    const scoped = all.filter((b) => allowed.has(b._id));
    return scoped.length > 0
      ? { visibleBrands: scoped, brandsAreScoped: true }
      : { visibleBrands: all, brandsAreScoped: false };
  }, [brands, scopedBrandIds, brandSearch]);

  // A brand ticked before the categories narrowed past it would keep filtering
  // invisibly — drop those so the panel and the results agree.
  //
  // Keyed off the scope, never off the rendered list: that list also narrows to
  // whatever is typed in the brand search box, so pruning against it would
  // quietly untick a brand the moment the search stopped matching its name.
  useEffect(() => {
    if (!scopedBrandIds?.length || !value.brandIds.length) return;
    const known = new Set((brands || []).map((b) => b._id));
    const allowed = new Set(scopedBrandIds.filter((id) => known.has(id)));
    // No overlap means the panel fell back to showing every brand; pruning here
    // would clear the selection under a list that still offers it.
    if (allowed.size === 0) return;
    const kept = value.brandIds.filter((id) => allowed.has(id));
    if (kept.length !== value.brandIds.length) onChange({ brandIds: kept });
    // onChange is recreated per render by the parent; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedBrandIds, brands, value.brandIds]);

  const activeCount = countActiveFilters(value);

  const renderNode = (node: CategoryNode, depth: number): React.ReactNode => {
    if (matchedCategoryIds && !matchedCategoryIds.has(node._id)) return null;
    const hasChildren = node.children.length > 0;
    const isOpen = openCategories.has(node._id) || Boolean(matchedCategoryIds);
    const isChecked = value.categoryIds.includes(node._id);
    const branch = descendantsOf.get(node._id) || [node._id];
    const partly =
      !isChecked && branch.some((id) => value.categoryIds.includes(id));

    return (
      <div key={node._id}>
        <div
          className="flex items-center gap-1"
          style={{ paddingInlineStart: `${depth * 0.85}rem` }}
        >
          <label className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer flex-1 min-w-0">
            <input
              type="checkbox"
              checked={isChecked}
              ref={(el) => {
                if (el) el.indeterminate = partly;
              }}
              onChange={(e) => toggleCategory(node._id, e.target.checked)}
              className="w-4 h-4 shrink-0 rounded border-gray-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
            />
            <span
              className={`truncate ${
                depth === 0 ? "text-sm text-gray-800" : "text-xs text-gray-500"
              } ${isChecked ? "font-semibold text-[var(--brand-accent)]" : ""}`}
              title={label(node)}
            >
              {label(node)}
            </span>
            {node.isActive === false && (
              <span className="shrink-0 text-[10px] text-gray-400">
                ({t("Inactive")})
              </span>
            )}
          </label>
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleOpen(node._id)}
              aria-expanded={isOpen}
              aria-label={label(node)}
              className="w-6 h-6 shrink-0 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <ChevronDownIcon
                className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
        {hasChildren && isOpen && (
          <div className="border-s-2 border-[var(--brand-primary)]/15 ms-3">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
        <h2 className="font-bold text-gray-800 text-sm">
          {t("Filters")}
          {activeCount > 0 && (
            <span className="ms-2 text-[10px] bg-[var(--brand-primary)]/10 text-[var(--brand-accent)] px-2 py-0.5 rounded-full font-medium">
              {activeCount} {t("active")}
            </span>
          )}
        </h2>
        {activeCount > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
          >
            <XMarkIcon className="w-4 h-4" />
            {t("Clear")}
          </button>
        )}
      </div>

      {/* Categories — first, because it is the filter everything else narrows from */}
      <Section title={t("Categories")} count={value.categoryIds.length}>
        <input
          type="text"
          value={categorySearch}
          onChange={(e) => setCategorySearch(e.target.value)}
          placeholder={t("Search categories")}
          className="w-full mb-2 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
        />
        {isAdmin && (
          <button
            onClick={() =>
              onChange({ categoryIds: allSelected ? [] : allCategoryIds })
            }
            className="w-full mb-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--brand-primary)] text-[var(--brand-accent)] hover:bg-[var(--brand-primary)]/10 transition-colors"
          >
            {allSelected
              ? t("Deselect all categories")
              : t("Select all categories ({{count}})", { count: allCategoryIds.length })}
          </button>
        )}
        <div className="max-h-80 overflow-y-auto -mx-1 px-1">
          {tree.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">{t("No categories")}</p>
          ) : (
            tree.map((node) => renderNode(node, 0))
          )}
        </div>
      </Section>

      {/* Brands — scoped to whatever the categories above selected */}
      <Section title={t("Brands")} count={value.brandIds.length}>
        {brandsAreScoped && (
          <p className="text-[10px] text-[var(--brand-accent)] mb-2">
            {t("Showing brands in the selected categories")}
          </p>
        )}
        <input
          type="text"
          value={brandSearch}
          onChange={(e) => setBrandSearch(e.target.value)}
          placeholder={t("Search brands")}
          className="w-full mb-2 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
        />
        <div className="max-h-56 overflow-y-auto -mx-1 px-1 space-y-0.5">
          {visibleBrands.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">{t("No brands")}</p>
          ) : (
            visibleBrands.map((brand) => (
              <label
                key={brand._id}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={value.brandIds.includes(brand._id)}
                  onChange={(e) => toggleBrand(brand._id, e.target.checked)}
                  className="w-4 h-4 shrink-0 rounded border-gray-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                />
                {brand.logo && (
                  <img
                    src={brand.logo}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                    className="w-5 h-5 object-contain shrink-0"
                  />
                )}
                <span className="text-sm text-gray-700 truncate">{label(brand)}</span>
              </label>
            ))
          )}
        </div>
      </Section>

      {/* Price */}
      <Section title={t("Price Range (EGP)")}>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            placeholder={t("Min")}
            value={value.priceMin}
            onChange={(e) => onChange({ priceMin: e.target.value })}
            className="min-w-0 flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
          />
          <span className="text-gray-400 text-xs">—</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder={t("Max")}
            value={value.priceMax}
            onChange={(e) => onChange({ priceMax: e.target.value })}
            className="min-w-0 flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
          />
        </div>
      </Section>

      {/* Stock / status / vendor */}
      <Section title={t("Stock & Status")}>
        <div className="space-y-2">
          <select
            value={value.stockStatus}
            onChange={(e) => onChange({ stockStatus: e.target.value })}
            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[var(--brand-primary)]"
          >
            <option value="">{t("Any stock level")}</option>
            <option value="in_stock">{t("In Stock")}</option>
            <option value="low_stock">{t("Low Stock")}</option>
            <option value="out_of_stock">{t("Out of Stock")}</option>
          </select>
          <select
            value={value.productStatus}
            onChange={(e) => onChange({ productStatus: e.target.value })}
            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[var(--brand-primary)]"
          >
            <option value="">{t("Any status")}</option>
            <option value="active">{t("Active")}</option>
            <option value="inactive">{t("Inactive")}</option>
          </select>
          {vendors.length > 0 && (
            <select
              value={value.vendor}
              onChange={(e) => onChange({ vendor: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
              <option value="">{t("All vendors")}</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name || v.storeName || v._id.slice(-6)}
                </option>
              ))}
            </select>
          )}
        </div>
      </Section>

      {/* Bulk selection — admin only */}
      {isAdmin && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {t("Bulk selection")}
          </h3>
          <button
            onClick={onSelectAllProducts}
            disabled={selectingAll || totalProductCount === 0}
            className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--brand-accent)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {selectingAll
              ? t("Selecting…")
              : t("Select all {{count}} products", { count: totalProductCount })}
          </button>
          {selectedProductCount > 0 && (
            <button
              onClick={onClearSelection}
              className="w-full px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 transition-colors"
            >
              {t("Clear selection ({{count}})", { count: selectedProductCount })}
            </button>
          )}
          <p className="text-[10px] text-gray-400 leading-relaxed">
            {t("Selects every product matching the filters, not just this page.")}
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminProductFilters;
