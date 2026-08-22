import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCategoryStore } from "../../stores/category.store";
import SearchableTreeSelect, { type TreeOption } from "../SearchableTreeSelect";

/**
 * Where a banner button goes.
 *
 * The three kinds of destination the shop actually uses, asked for in the
 * terms the person filling the form thinks in — a page, a department, or an
 * address they were given — and resolved here into the one path the storefront
 * stores.
 *
 * The department case is the reason this exists rather than a plain text box.
 * The catalogue filters on `?category=<_id>`, so a link written by hand as
 * `/products?category=surveillance` matches nothing and lands the visitor on
 * an empty results page — with no error anywhere, because an empty filter is a
 * legitimate answer. Picking the department here writes the id.
 */

/** Somewhere on the storefront that is a page rather than a filter. */
const PAGES: { path: string; label: string; labelAr: string }[] = [
  { path: "/", label: "Home", labelAr: "الرئيسية" },
  { path: "/products", label: "All products", labelAr: "كل المنتجات" },
  { path: "/deals", label: "Deals", labelAr: "العروض" },
  { path: "/installations", label: "Installations", labelAr: "التركيبات" },
  { path: "/collections", label: "Bundles", labelAr: "التجميعات" },
  { path: "/brands", label: "Brands", labelAr: "الماركات" },
  { path: "/electronics", label: "Electronics / students", labelAr: "الإلكترونيات والطلاب" },
  { path: "/contact", label: "Contact", labelAr: "تواصل معنا" },
  { path: "/cart", label: "Cart", labelAr: "السلة" },
  { path: "/wishlist", label: "Wishlist", labelAr: "المفضلة" },
];

const CATEGORY_PREFIX = "/products?category=";

type Kind = "page" | "category" | "custom";

const kindOf = (href: string): Kind => {
  if (href.startsWith(CATEGORY_PREFIX)) return "category";
  if (PAGES.some((page) => page.path === href)) return "page";
  return "custom";
};

const categoryIdOf = (href: string) =>
  href.startsWith(CATEGORY_PREFIX)
    ? decodeURIComponent(href.slice(CATEGORY_PREFIX.length))
    : "";

interface Props {
  value: string;
  onChange: (href: string) => void;
  /** Rendered above the control. */
  label?: string;
}

const LinkPicker: React.FC<Props> = ({ value, onChange, label }) => {
  const { t, i18n } = useTranslation();
  const isArabic = (i18n.language || "en").toLowerCase().startsWith("ar");
  const categories = useCategoryStore((state) => state.categories);

  const kind = kindOf(value || "");

  /**
   * The flat catalogue as a tree, in reading order.
   *
   * Built from `parentCategory` rather than a `level` field: the list arrives
   * flat, a category's parent may come back as an id or as a populated object
   * depending on the endpoint, and the depth a picker needs is the one implied
   * by the chain, not one stored alongside it.
   */
  const options: TreeOption[] = useMemo(() => {
    const parentIdOf = (category: any): string | undefined => {
      const parent = category.parentCategory;
      if (!parent) return undefined;
      return typeof parent === "string" ? parent : parent?._id;
    };

    const childrenOf = new Map<string, any[]>();
    const roots: any[] = [];
    for (const category of categories) {
      const parentId = parentIdOf(category);
      if (parentId) {
        const bucket = childrenOf.get(parentId) || [];
        bucket.push(category);
        childrenOf.set(parentId, bucket);
      } else {
        roots.push(category);
      }
    }

    const byName = (a: any, b: any) =>
      String(a.name || "").localeCompare(String(b.name || ""));

    const out: TreeOption[] = [];
    const walk = (nodes: any[], depth: number, trail: string[]) => {
      for (const node of [...nodes].sort(byName)) {
        const name = String(node.name || "");
        out.push({ id: node._id, name, depth, trail });
        walk(childrenOf.get(node._id) || [], depth + 1, [...trail, name]);
      }
    };
    walk(roots, 0, []);
    return out;
  }, [categories]);

  const setKind = (next: Kind) => {
    // Changing the kind clears the address rather than carrying the old one
    // across: a category id left sitting in the custom box is a link that
    // looks deliberate and goes nowhere useful.
    if (next === "page") onChange("/products");
    else if (next === "category") onChange(CATEGORY_PREFIX);
    else onChange("");
  };

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
      active
        ? "bg-[#002B5B] text-white border-[#002B5B]"
        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
    }`;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={tabClass(kind === "page")} onClick={() => setKind("page")}>
          {t("linkPicker.page", "A page")}
        </button>
        <button
          type="button"
          className={tabClass(kind === "category")}
          onClick={() => setKind("category")}
        >
          {t("linkPicker.category", "A department (filtered)")}
        </button>
        <button
          type="button"
          className={tabClass(kind === "custom")}
          onClick={() => setKind("custom")}
        >
          {t("linkPicker.custom", "A custom address")}
        </button>
      </div>

      {kind === "page" && (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A8E8] focus:border-transparent"
        >
          {PAGES.map((page) => (
            <option key={page.path} value={page.path}>
              {isArabic ? page.labelAr : page.label}
            </option>
          ))}
        </select>
      )}

      {kind === "category" && (
        <>
          <SearchableTreeSelect
            options={options}
            value={categoryIdOf(value)}
            onChange={(id) => onChange(id ? `${CATEGORY_PREFIX}${encodeURIComponent(id)}` : CATEGORY_PREFIX)}
            emptyLabel={t("linkPicker.pickDepartment", "Pick a department…")}
            searchLabel={t("linkPicker.searchDepartment", "Search departments")}
            noResultsLabel={t("linkPicker.noDepartment", "No department matches that")}
          />
          {!categoryIdOf(value) && (
            <p className="text-xs text-amber-600">
              {t(
                "linkPicker.noDepartmentPicked",
                "Nothing picked yet — the button would open the whole catalogue."
              )}
            </p>
          )}
        </>
      )}

      {kind === "custom" && (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/products?brand=hikvision"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A8E8] focus:border-transparent"
          dir="ltr"
        />
      )}

      {/* The resolved path, always visible. What is stored is what the visitor
          will land on, and a picker that hides it is a picker you have to
          trust rather than read. */}
      <p className="text-[11px] font-mono text-gray-500 break-all" dir="ltr">
        {value || "—"}
      </p>
    </div>
  );
};

export default LinkPicker;
