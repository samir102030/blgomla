import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bars3Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useCategoryStore } from "../stores/category.store";
import type { Category } from "../types/category.type";
import i18n from "../lib/i18n";

/**
 * The storefront's category menu, three levels deep.
 *
 * The catalogue is a tree — `parentCategory` puts no limit on how deep it goes
 * — and the menu shows all of it, but not by laying it out flat. Putting every
 * root in the bar worked while there were nine of them; at a hundred and
 * seventy the bar became a twelve-row wall of names above every page, which is
 * a table of contents where a navigation bar should be.
 *
 * So the whole catalogue lives behind one control at the start of the row, and
 * opens as a panel: roots down the left, the children of whichever root the
 * pointer is on to the right, and a search box for the case a shopper already
 * knows the word they want. Depth is not assumed anywhere — a root with no
 * children is a plain link, and a branch that stops early simply shows less.
 */

export interface CategoryNode extends Category {
  children: CategoryNode[];
}

const parentIdOf = (c: Category): string | null => {
  const parent = c.parentCategory;
  if (!parent) return null;
  return typeof parent === "string" ? parent : parent._id || null;
};

/** Live, and not held back from the menu by the storefront visibility screen. */
const isMenuVisible = (c: Category) =>
  c.isActive !== false && !c.deleted && c.showInMenu !== false;

const labelOf = (c: Category) =>
  i18n.language === "ar" && c.nameAr ? c.nameAr : c.name;

/**
 * Build the menu tree from the flat category list.
 *
 * A category whose parent is hidden is hidden with it, rather than promoted to
 * the top of the menu: hiding "Laptop" is meant to take its subcategories out
 * of the bar too, not scatter them across it as roots.
 */
const useCategoryMenuTree = (): CategoryNode[] => {
  const categories = useCategoryStore((state) => state.categories);

  return useMemo(() => {
    const nodes = new Map<string, CategoryNode>();
    for (const c of categories || []) {
      if (isMenuVisible(c)) nodes.set(c._id, { ...c, children: [] });
    }

    const roots: CategoryNode[] = [];
    for (const node of nodes.values()) {
      const parentId = parentIdOf(node);
      if (!parentId) {
        roots.push(node);
        continue;
      }
      nodes.get(parentId)?.children.push(node);
    }

    const sortDeep = (list: CategoryNode[]) => {
      list.sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          labelOf(a).localeCompare(labelOf(b))
      );
      for (const node of list) sortDeep(node.children);
    };
    sortDeep(roots);

    return roots;
    // Not keyed on the language: switching it refetches the categories (the
    // names come back translated), so the list itself changes and the tree is
    // rebuilt — sorted by the names actually on screen.
  }, [categories]);
};

/* ────────────────────────────── desktop ────────────────────────────── */

/** Every node in the tree, flattened, with the trail that leads to it. */
const flattenWithTrail = (
  nodes: CategoryNode[],
  trail: string[] = []
): Array<{ node: CategoryNode; trail: string[] }> =>
  nodes.flatMap((node) => [
    { node, trail },
    ...flattenWithTrail(node.children, [...trail, labelOf(node)]),
  ]);

/**
 * The catalogue behind one button at the start of the nav row.
 *
 * The left column scrolls and the right one does not: the roots are the long
 * list, and a department's own children are few enough to lay out at once. The
 * right column is a grid rather than a single file so a department of twenty
 * subcategories reads across instead of running off the bottom of the window.
 */
export const CategoryMenuButton: React.FC = () => {
  const { t } = useTranslation();
  const tree = useCategoryMenuTree();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const goToCategory = (id: string) => {
    setOpen(false);
    setQuery("");
    navigate(`/products?category=${encodeURIComponent(id)}`);
  };

  // Close on a click anywhere else, and on Escape. Without the outside click a
  // panel this large can be left covering the page with no obvious way back.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
    else setActiveId(null);
  }, [open]);

  const active = useMemo(
    () => tree.find((n) => n._id === activeId) ?? tree[0] ?? null,
    [tree, activeId]
  );

  /**
   * Search runs over the whole tree, not just the roots.
   *
   * With this many categories the name a shopper wants is usually a
   * subcategory, and making them find its parent first to discover it is the
   * problem the panel exists to solve.
   */
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;
    return flattenWithTrail(tree)
      .filter(({ node }) =>
        `${node.name} ${node.nameAr || ""}`.toLowerCase().includes(term)
      )
      .slice(0, 60);
  }, [tree, query]);

  const totalRoots = tree.length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-2 py-2.5 px-3 text-[13px] font-semibold uppercase whitespace-nowrap text-[var(--brand-nav-text)] rounded-lg transition-all ${
          open ? "opacity-100 bg-[var(--brand-primary)]/15" : "opacity-80 hover:opacity-100 hover:bg-[var(--brand-primary)]/10"
        }`}
      >
        <Bars3Icon className="w-4 h-4 shrink-0" />
        {t("All Categories")}
        <ChevronDownIcon
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 z-50 w-[min(56rem,calc(100vw-2rem))] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-fadeInDown">
          {/* Search */}
          <div className="p-2.5 border-b border-[var(--border)]">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 text-[var(--text-subtle)] pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search categories")}
                className="w-full ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-2 text-sm rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
              />
            </div>
          </div>

          {matches ? (
            <div className="max-h-[70vh] overflow-y-auto p-2">
              {matches.length === 0 ? (
                <p className="px-3 py-6 text-sm text-[var(--text-muted)] text-center">
                  {t("No categories")}
                </p>
              ) : (
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0.5">
                  {matches.map(({ node, trail }) => (
                    <li key={node._id}>
                      <button
                        type="button"
                        onClick={() => goToCategory(node._id)}
                        className="w-full text-start px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                      >
                        <span className="block text-sm text-[var(--text)] leading-snug">
                          {labelOf(node)}
                        </span>
                        {trail.length > 0 && (
                          <span className="block text-[11px] text-[var(--text-subtle)] truncate">
                            {trail.join(" › ")}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex">
              {/* Roots */}
              <ul className="w-60 shrink-0 max-h-[70vh] overflow-y-auto py-1.5 border-e border-[var(--border)]">
                {tree.map((node) => {
                  const isActive = active?._id === node._id;
                  return (
                    <li key={node._id}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveId(node._id)}
                        onFocus={() => setActiveId(node._id)}
                        onClick={() => goToCategory(node._id)}
                        className={`w-full flex items-center gap-2 text-start px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? "bg-[var(--surface-2)] text-[var(--brand-primary)] font-medium"
                            : "text-[var(--text)] hover:bg-[var(--surface-2)]"
                        }`}
                      >
                        <span className="flex-1 leading-snug">{labelOf(node)}</span>
                        {node.children.length > 0 && (
                          <ChevronRightIcon className="w-3.5 h-3.5 shrink-0 text-[var(--text-subtle)] rtl:rotate-180" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Children of the root under the pointer */}
              <div className="flex-1 min-w-0 max-h-[70vh] overflow-y-auto p-3">
                {active && (
                  <>
                    <button
                      type="button"
                      onClick={() => goToCategory(active._id)}
                      className="text-sm font-semibold text-[var(--brand-primary)] hover:underline mb-2"
                    >
                      {t("See all")} {labelOf(active)} →
                    </button>
                    {active.children.length === 0 ? (
                      <p className="text-xs text-[var(--text-subtle)]">
                        {t("No subcategories")}
                      </p>
                    ) : (
                      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-0.5">
                        {active.children.map((child) => (
                          <li key={child._id} className="min-w-0">
                            <button
                              type="button"
                              onClick={() => goToCategory(child._id)}
                              className="w-full text-start px-2 py-1.5 text-sm text-[var(--text)] rounded-lg hover:bg-[var(--surface-2)] hover:text-[var(--brand-primary)] transition-colors leading-snug"
                            >
                              {labelOf(child)}
                            </button>
                            {/* The third level, listed under its parent rather
                                than behind another hover — one more flyout on a
                                panel this wide is a target that is easy to slip
                                off and hard to get back to. */}
                            {child.children.length > 0 && (
                              <ul className="mb-1.5 ms-2 ps-2 border-s border-[var(--border)]">
                                {child.children.map((grand) => (
                                  <li key={grand._id}>
                                    <button
                                      type="button"
                                      onClick={() => goToCategory(grand._id)}
                                      className="w-full text-start px-2 py-1 text-xs text-[var(--text-muted)] rounded hover:bg-[var(--surface-2)] hover:text-[var(--brand-primary)] transition-colors leading-snug"
                                    >
                                      {labelOf(grand)}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {totalRoots > 0 && (
            <div className="px-3 py-1.5 border-t border-[var(--border)] text-[11px] text-[var(--text-subtle)]">
              {t("{{count}} departments", { count: totalRoots })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────── mobile ────────────────────────────── */

interface AccordionRowProps {
  node: CategoryNode;
  depth: number;
  onPick: (id: string) => void;
}

const AccordionRow: React.FC<AccordionRowProps> = ({ node, depth, onPick }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onPick(node._id)}
          className="flex-1 text-start py-2.5 px-4 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg transition-colors truncate"
          style={{ paddingInlineStart: `${1 + depth * 0.75}rem` }}
        >
          {labelOf(node)}
        </button>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={t("Categories")}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-[var(--text-subtle)] hover:bg-[var(--surface-2)]"
          >
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {hasChildren && open && (
        <ul className="flex flex-col gap-0.5">
          {node.children.map((child) => (
            <AccordionRow
              key={child._id}
              node={child}
              depth={depth + 1}
              onPick={onPick}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

/**
 * The same tree for the mobile drawer.
 *
 * Tapping a name opens it; the chevron beside it expands the level below. They
 * are separate targets on purpose — one control that both navigates and
 * expands makes a parent category impossible to open on a touchscreen.
 */
export const CategoryAccordion: React.FC<{ onNavigate?: () => void }> = ({
  onNavigate,
}) => {
  const tree = useCategoryMenuTree();
  const navigate = useNavigate();

  const goToCategory = (id: string) => {
    onNavigate?.();
    navigate(`/products?category=${encodeURIComponent(id)}`);
  };

  return (
    <ul className="flex flex-col gap-0.5">
      {tree.map((node) => (
        <AccordionRow key={node._id} node={node} depth={0} onPick={goToCategory} />
      ))}
    </ul>
  );
};
