import type { Category } from "../../types/category.type";

/**
 * Shape and helpers behind the admin product filter panel.
 *
 * Kept out of the component file so that file exports only a component: mixing
 * the two costs Fast Refresh, which stops hot-reloading a module the moment it
 * also exports a constant.
 */

export interface AdminProductFilterState {
  categoryIds: string[];
  brandIds: string[];
  priceMin: string;
  priceMax: string;
  stockStatus: string;
  productStatus: string;
  vendor: string;
}

export const EMPTY_ADMIN_FILTERS: AdminProductFilterState = {
  categoryIds: [],
  brandIds: [],
  priceMin: "",
  priceMax: "",
  stockStatus: "",
  productStatus: "",
  vendor: "",
};

/** Parent id whether the field arrives populated or as a raw id. */
export const parentIdOf = (c: Category): string | null => {
  const parent = c.parentCategory;
  if (!parent) return null;
  return typeof parent === "string" ? parent : parent._id || null;
};

/**
 * Drop selected categories that sit under another selected one.
 *
 * The server matches a category's whole subtree, so a child listed next to its
 * parent narrows nothing and only lengthens the query string — "select all"
 * would otherwise put every id in the catalogue into a URL. Sending the roots
 * of the selection means the same products for a fraction of the bytes.
 */
export const minimalCategorySelection = (
  selected: string[],
  categories: Category[]
): string[] => {
  if (selected.length < 2) return selected;
  const parentOf = new Map<string, string | null>(
    (categories || []).map((c) => [c._id, parentIdOf(c)])
  );
  const chosen = new Set(selected);
  return selected.filter((id) => {
    let parent = parentOf.get(id) ?? null;
    let guard = 0;
    while (parent && guard++ < 10) {
      if (chosen.has(parent)) return false;
      parent = parentOf.get(parent) ?? null;
    }
    return true;
  });
};

/** How many of these filters are actually narrowing anything. */
export const countActiveFilters = (f: AdminProductFilterState) =>
  [
    f.categoryIds.length > 0,
    f.brandIds.length > 0,
    Boolean(f.priceMin || f.priceMax),
    Boolean(f.stockStatus),
    Boolean(f.productStatus),
    Boolean(f.vendor),
  ].filter(Boolean).length;
