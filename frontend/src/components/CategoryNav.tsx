import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useCategoryStore } from "../stores/category.store";
import type { Category } from "../types/category.type";
import i18n from "../lib/i18n";

/**
 * The storefront's category menu, three levels deep.
 *
 * The catalogue has always been a tree — `parentCategory` puts no limit on how
 * deep it goes — but the menu only ever showed two levels of it, and showed
 * them as one flyout listing every root down the side. A third level had
 * nowhere to appear, so the only way to reach one was a link nothing rendered.
 *
 * The shape here is the one shoppers already know from every parts catalogue:
 * roots sit in the bar itself, hovering one drops its children below it, and a
 * child that has children of its own opens them to the side. Depth is not
 * assumed anywhere — a root with no children is a plain link, and a branch that
 * stops at two levels simply never shows the side panel.
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

/**
 * Keep a panel inside the viewport.
 *
 * A dropdown under the last category in the bar, and every side flyout opening
 * off one, runs out of room on the right — in Arabic, on the left. Measured
 * once per open, before paint, so the panel is never seen in the wrong place.
 */
const useEdgeFlip = (open: boolean) => {
  const ref = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);

  useLayoutEffect(() => {
    if (!open) {
      setFlipped(false);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const rtl = document.dir === "rtl" || i18n.language === "ar";
    setFlipped(rtl ? box.left < 8 : box.right > window.innerWidth - 8);
    // Deliberately keyed on `open` alone: re-measuring after the flip would
    // read the flipped position and could send the panel back again.
  }, [open]);

  return { ref, flipped };
};

/* ────────────────────────────── desktop ────────────────────────────── */

interface BranchProps {
  node: CategoryNode;
  onPick: (id: string) => void;
}

/**
 * A panel may scroll only when nothing opens out of its side.
 *
 * `overflow-y: auto` clips on both axes, so a scrollable list swallows the
 * flyouts its own rows open — the third level was rendered, hoverable and
 * invisible. Where a level below exists the panel is left unscrolled and grows
 * instead; where it doesn't, a long list still scrolls as before.
 */
const panelScrollClass = (node: CategoryNode) =>
  node.children.some((child) => child.children.length > 0)
    ? ""
    : "max-h-[26rem] overflow-y-auto";

/** One row inside a dropdown, plus its own children off to the side. */
const DropdownRow: React.FC<BranchProps> = ({ node, onPick }) => {
  const [open, setOpen] = useState(false);
  const { ref, flipped } = useEdgeFlip(open);
  const hasChildren = node.children.length > 0;

  return (
    <li
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => onPick(node._id)}
        onFocus={() => setOpen(true)}
        aria-haspopup={hasChildren || undefined}
        aria-expanded={hasChildren ? open : undefined}
        className="w-full flex items-center gap-2 text-start px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] hover:text-[var(--brand-primary)] transition-colors"
      >
        <span className="flex-1 truncate">{labelOf(node)}</span>
        {hasChildren && (
          <ChevronRightIcon className="w-3.5 h-3.5 shrink-0 text-[var(--text-subtle)] rtl:rotate-180" />
        )}
      </button>

      {hasChildren && open && (
        <div
          ref={ref}
          className={`absolute top-0 w-60 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl z-50 ${panelScrollClass(
            node
          )} ${
            flipped
              ? "ltr:right-full rtl:left-full"
              : "ltr:left-full rtl:right-full"
          }`}
        >
          <ul>
            {node.children.map((child) => (
              <DropdownRow key={child._id} node={child} onPick={onPick} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
};

/** One root category in the bar, with its dropdown. */
const RootItem: React.FC<BranchProps> = ({ node, onPick }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { ref, flipped } = useEdgeFlip(open);
  const hasChildren = node.children.length > 0;

  const pick = (id: string) => {
    setOpen(false);
    onPick(id);
  };

  return (
    <li
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => (hasChildren ? setOpen((v) => !v) : pick(node._id))}
        aria-haspopup={hasChildren || undefined}
        aria-expanded={hasChildren ? open : undefined}
        className={`flex items-center gap-1.5 py-3 px-3 text-sm font-semibold uppercase tracking-wide whitespace-nowrap text-[var(--brand-nav-text)] border-b-2 transition-all ${
          open
            ? "opacity-100 border-[var(--brand-primary)]"
            : "opacity-70 hover:opacity-100 border-transparent"
        }`}
      >
        {labelOf(node)}
        {hasChildren && (
          <ChevronDownIcon
            className={`w-3.5 h-3.5 shrink-0 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {hasChildren && open && (
        <div
          ref={ref}
          className={`absolute top-full w-64 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-b-xl shadow-2xl z-50 animate-fadeInDown ${panelScrollClass(
            node
          )} ${flipped ? "ltr:right-0 rtl:left-0" : "ltr:left-0 rtl:right-0"}`}
        >
          <ul>
            {node.children.map((child) => (
              <DropdownRow key={child._id} node={child} onPick={pick} />
            ))}
          </ul>
          {/* The root itself is a place products can be filed, and the only
              way to see the branch whole. Its own row makes that reachable
              instead of leaving the parent clickable by luck. */}
          <div className="mt-1 pt-1.5 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => pick(node._id)}
              className="w-full text-start px-4 py-2 text-xs font-medium text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)]"
            >
              {t("See all")} {labelOf(node)} →
            </button>
          </div>
        </div>
      )}
    </li>
  );
};

/**
 * The root categories, as `<li>` items for the desktop nav bar.
 *
 * Rendered as a fragment so they sit in the same row as the rest of the nav
 * links rather than in a bar of their own.
 */
export const CategoryNavItems: React.FC = () => {
  const tree = useCategoryMenuTree();
  const navigate = useNavigate();

  const goToCategory = (id: string) =>
    navigate(`/products?category=${encodeURIComponent(id)}`);

  return (
    <>
      {tree.map((node) => (
        <RootItem key={node._id} node={node} onPick={goToCategory} />
      ))}
    </>
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
