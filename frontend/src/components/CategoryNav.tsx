import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bars3Icon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
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
  /** The name in the language on screen, resolved once when the tree is built
   *  so that what is sorted and what is shown can never disagree. */
  label: string;
}

const parentIdOf = (c: Category): string | null => {
  const parent = c.parentCategory;
  if (!parent) return null;
  return typeof parent === "string" ? parent : parent._id || null;
};

/** Live, and not held back from the menu by the storefront visibility screen. */
const isMenuVisible = (c: Category) =>
  c.isActive !== false && !c.deleted && c.showInMenu !== false;

/**
 * Categories carry both names at once — the API returns `name` and `nameAr` on
 * every row — so which one is shown is decided here, and the language has to
 * be passed in rather than read off the shared i18n object. Read at render
 * time it is a value React knows nothing about: a switch changes it without
 * telling anything to render again, and the menu keeps the names it already
 * had until something unrelated re-renders it.
 */
const labelOf = (c: Category, language: string) =>
  language === "ar" && c.nameAr ? c.nameAr : c.name;

/**
 * Build the menu tree from the flat category list.
 *
 * A category whose parent is hidden is hidden with it, rather than promoted to
 * the top of the menu: hiding "Laptop" is meant to take its subcategories out
 * of the bar too, not scatter them across it as roots.
 */
const useCategoryMenuTree = (): CategoryNode[] => {
  const categories = useCategoryStore((state) => state.categories);
  // Through the hook, so switching the language re-runs the build. The i18n
  // object read directly is not reactive, and a menu built once kept whichever
  // language happened to be on when it was built.
  const { i18n } = useTranslation();
  const language = i18n.language;

  return useMemo(() => {
    const nodes = new Map<string, CategoryNode>();
    for (const c of categories || []) {
      if (isMenuVisible(c))
        nodes.set(c._id, { ...c, children: [], label: labelOf(c, language) });
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
          a.label.localeCompare(b.label, language)
      );
      for (const node of list) sortDeep(node.children);
    };
    sortDeep(roots);

    return roots;
  }, [categories, language]);
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
    : // Generous, because a real department runs to a dozen-plus entries and
      // the menu should show them rather than hand back a scrollbar. Still
      // bounded, so it can never run past the bottom of the window.
      "max-h-[75vh] overflow-y-auto";

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
        {/* Wraps rather than truncates: "Uninterruptible Power Supply (UPS)"
            cut off at the panel edge is not a category anyone can identify. */}
        <span className="flex-1 leading-snug">{node.label}</span>
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

/**
 * The whole catalogue behind one button in the nav row.
 *
 * Roots were tried in the bar itself, which put every department on screen at
 * once but cost the bar a second row that grew with the catalogue. This is the
 * arrangement the shop had before that: one entry point, the departments in a
 * panel under it, and each department opening its own children to the side —
 * the same three levels, folded into one control.
 *
 * The panel deliberately does not scroll. `overflow-y` clips on both axes, so
 * a scrollable list swallows the side flyouts its own rows open; the panel
 * grows instead, exactly as `panelScrollClass` decides for the levels below.
 */
export const AllCategoriesMenu: React.FC = () => {
  const { t } = useTranslation();
  const tree = useCategoryMenuTree();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const pick = (id: string) => {
    setOpen(false);
    navigate(`/products?category=${encodeURIComponent(id)}`);
  };

  // Nothing to open until the catalogue has loaded.
  if (!tree.length) return null;

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
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex items-center gap-2 py-3 px-4 text-[13px] font-bold uppercase whitespace-nowrap text-[var(--brand-nav-text)] border-b-2 transition-all ${
          open
            ? "opacity-100 border-[var(--brand-primary)]"
            : "opacity-80 hover:opacity-100 border-transparent"
        }`}
      >
        <Bars3Icon className="w-4 h-4 shrink-0" />
        {t("All Categories")}
        <ChevronDownIcon
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full ltr:left-0 rtl:right-0 w-64 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-b-xl shadow-2xl z-50 animate-fadeInDown">
          <ul>
            {tree.map((node) => (
              <DropdownRow key={node._id} node={node} onPick={pick} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
};

/* ───────────────────────── the department strip ───────────────────── */

/**
 * One department in the strip, with its branch hanging under it.
 *
 * The button is the department itself — clicking it opens that department's
 * page rather than only expanding it — and the panel opens on hover and on
 * focus so the row is usable from the keyboard as well as the mouse.
 */
const StripItem: React.FC<BranchProps> = ({ node, onPick }) => {
  const [open, setOpen] = useState(false);
  const { ref, flipped } = useEdgeFlip(open);
  const hasChildren = node.children.length > 0;

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
        onClick={() => onPick(node._id)}
        onFocus={() => setOpen(true)}
        aria-haspopup={hasChildren || undefined}
        aria-expanded={hasChildren ? open : undefined}
        /* No size of its own: the row sets one on itself and every item
           inherits it, which is what lets the whole strip be measured and
           resized as a unit. */
        className={`flex items-center gap-1.5 py-2.5 px-1 font-semibold uppercase tracking-wide whitespace-nowrap border-b-2 transition-all ${
          open
            ? "text-[var(--brand-primary)] border-[var(--brand-primary)]"
            : "text-[var(--text)] border-transparent hover:text-[var(--brand-primary)]"
        }`}
      >
        {node.label}
        {hasChildren && (
          <ChevronDownIcon
            className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {hasChildren && open && (
        <div
          ref={ref}
          className={`absolute top-full w-60 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-b-xl shadow-2xl z-50 animate-fadeInDown ${
            flipped ? "ltr:right-0 rtl:left-0" : "ltr:left-0 rtl:right-0"
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

/**
 * Which departments the strip shows, and in what order.
 *
 * A chosen shortlist rather than "every root", because the two things a bar
 * has to be — complete and one line long — cannot both be true of a catalogue
 * this size. The top level is eighteen departments; laid across the bar at
 * their full names they run past seventeen hundred pixels, and the row that
 * results is the reason this arrangement was tried once and taken out again.
 *
 * So the catalogue is not what decides the bar. This list is. Nothing here
 * changes the tree, moves a product or hides a department — `AllCategoriesMenu`
 * beside it still opens all of it, and a shopper who wants Monitors is one
 * click from it there.
 *
 * `slug` is the key rather than the name or the id: an id says nothing to the
 * person editing this list, and a name is something an operator is entitled to
 * change — to "Security Systems", or to Arabic — which would silently empty the
 * bar. Slugs are stable and readable, and any level of the tree can be named
 * here, not only a root.
 *
 * `short` is the label the bar shows when the real name is too long to fit
 * beside nine others. It is display only: the department keeps its real name
 * on its own page, in the menu, in search and in breadcrumbs. Leave it out and
 * the real name is used.
 */
export const BAR_DEPARTMENTS: {
  slug: string;
  short?: string;
  shortAr?: string;
}[] = [
  // Full names, by choice. They are wider than the bar is at its largest
  // type size, which is what `useFitToOneLine` below exists to absorb — the
  // row sets its own size rather than the names being cut to fit it.
  // Filling in a `short` here would let a department run at full type; the
  // trade is a name in the bar that is not the department's real name.
  { slug: "electronics" },
  { slug: "computers-laptops" },
  { slug: "storage" },
  { slug: "networking" },
  { slug: "surveillance-security" },
  { slug: "printing-scanning" },
  { slug: "point-of-sale-pos" },
  { slug: "gaming-consoles-games" },
  { slug: "telephony-conferencing" },
];

/*
  Sizes the row will try, largest first.

  Nine departments at their full names measure 1,594 pixels of type at 12px,
  and the bar is 1,440 at its widest — so one line at full size is not on the
  table, and shrinking to reach it means 10px, smaller than the nav row above
  and small enough to be hard to read.

  So the row is allowed two lines, and the type only drops if even two lines
  will not hold it. The floor is 11px: below that the reading cost is worse
  than the extra line it would save.
*/
const BAR_TYPE_SIZES = [12, 11.5, 11];

/**
 * Where to break a row that has to become two, so the halves come out even.
 *
 * Left to itself, flex-wrap fills the first line and drops whatever is left:
 * with these names that is eight departments on top and Telephony plus Hot
 * Deals underneath, which reads as a row that broke rather than a row of two
 * lines. Splitting at the point where the two halves are closest in width
 * gives five and five, and centred that looks like what it is.
 *
 * Returns the index the second line starts at, or null if it all fits on one.
 */
const balancePoint = (widths: number[], gap: number, room: number) => {
  const line = (from: number, to: number) =>
    widths.slice(from, to).reduce((sum, w) => sum + w, 0) + gap * Math.max(0, to - from - 1);

  if (line(0, widths.length) <= room) return null;

  let best = 1;
  let bestWorst = Infinity;
  for (let at = 1; at < widths.length; at += 1) {
    const worst = Math.max(line(0, at), line(at, widths.length));
    if (worst < bestWorst) {
      bestWorst = worst;
      best = at;
    }
  }
  return { at: best, worst: bestWorst };
};

/**
 * Set the row's type to the largest size on the ladder that keeps it to one
 * line, and re-measure whenever the window or the department list changes.
 *
 * Measured from the items themselves rather than from the row's scroll width:
 * the row is allowed to wrap, so its scroll width is never larger than the
 * space it has and would report every size as fitting. Each item is nowrap, so
 * the widths add up to what one line would need whether or not it is on one.
 *
 * Runs before paint, so the strip is never seen at the wrong size, and steps
 * down at most five times — cheap enough not to matter, and it stops at the
 * first size that fits.
 */
const useFitToOneLine = (signature: string) => {
  const ref = useRef<HTMLUListElement>(null);
  /* Null while it fits on one line; otherwise the index the second starts at.
     Only this is React state — the size is written straight to the element, so
     choosing it cannot cause the render that would make it be chosen again. */
  const [splitAt, setSplitAt] = useState<number | null>(null);

  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;

    /*
      Only the width it has to fill can change what fits, and what this writes
      changes the row's height — so without this guard the observer would
      answer its own writes forever. The row is a block-level flex container,
      so its width comes from the layout above it and never from the type
      inside it, which is what makes the width safe to compare against.
    */
    let lastRoom = -1;

    const fit = (force = false) => {
      const room = row.clientWidth;
      if (!force && room === lastRoom) return;
      lastRoom = room;

      const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0;

      /* The line-break spacer is a child of the row and is full-width by
         design; counting it would make every size look far too wide. */
      const widthsAt = (size: number) => {
        row.style.fontSize = `${size}px`;
        return (Array.from(row.children) as HTMLElement[])
          .filter((item) => item.dataset.barBreak === undefined)
          .map((item) => item.getBoundingClientRect().width);
      };

      for (const size of BAR_TYPE_SIZES) {
        const split = balancePoint(widthsAt(size), gap, room);
        // One line at this size, or two whose wider half still fits.
        if (!split) {
          row.style.fontSize = `${size}px`;
          setSplitAt(null);
          return;
        }
        if (split.worst <= room) {
          row.style.fontSize = `${size}px`;
          setSplitAt(split.at);
          return;
        }
      }

      /* Narrower than two balanced lines at the smallest size we are willing
         to use — a phone-width desktop window, or a much longer list. Take the
         floor and let flex-wrap do whatever it has to. */
      const floor = BAR_TYPE_SIZES[BAR_TYPE_SIZES.length - 1];
      row.style.fontSize = `${floor}px`;
      setSplitAt(null);
    };

    fit(true);

    /* The bar sits in a container that changes width with the window, and on
       a zoom or a late font swap without one. Observing the row catches all
       three; the width guard makes the rest no-ops. */
    const onResize = () => fit();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
    const observer = new ResizeObserver(onResize);
    observer.observe(row);
    return () => observer.disconnect();
  }, [signature]);

  return { ref, splitAt };
};

/** Every node in the menu tree, by slug, at any depth. */
const bySlugOf = (roots: CategoryNode[]) => {
  const index = new Map<string, CategoryNode>();
  const walk = (list: CategoryNode[]) => {
    for (const node of list) {
      if (node.slug) index.set(node.slug, node);
      walk(node.children);
    }
  };
  walk(roots);
  return index;
};

/**
 * The department strip: the chosen shortlist, across the bar.
 *
 * The row is allowed to wrap rather than scroll. A hidden horizontal scroller
 * is a row whose right-hand half nobody finds, and clipping on one axis clips
 * on both — it would swallow the very panels these items open. A second line
 * on a narrow window is honest, still entirely usable, and is the signal that
 * the list above has grown past what a bar can hold.
 */
export const CategoryBar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const tree = useCategoryMenuTree();
  const navigate = useNavigate();

  const departments = useMemo(() => {
    const index = bySlugOf(tree);
    const chosen: CategoryNode[] = [];
    for (const entry of BAR_DEPARTMENTS) {
      const node = index.get(entry.slug);
      // A slug that matches nothing is skipped rather than rendered empty:
      // a department can be renamed, hidden from the menu or deleted, and the
      // bar should lose that one item and keep the rest.
      if (!node) continue;
      const short = language === "ar" ? entry.shortAr : entry.short;
      chosen.push(short ? { ...node, label: short } : node);
    }
    // If the list matches nothing at all — every slug changed at once, or the
    // catalogue was reseeded — fall back to the departments themselves rather
    // than to a blank strip.
    return chosen.length ? chosen : tree;
  }, [tree, language]);

  // Keyed on which departments are in the row, so a rename or a department
  // appearing after the catalogue loads is re-measured rather than left at a
  // size that was chosen for different words.
  const { ref: rowRef, splitAt } = useFitToOneLine(
    departments.map((node) => node.label).join("|")
  );

  // Nothing to show until the catalogue has loaded — and an empty strip would
  // otherwise render as a bare line under the nav row.
  if (!departments.length) return null;

  const pick = (id: string) =>
    navigate(`/products?category=${encodeURIComponent(id)}`);

  const items: React.ReactNode[] = departments.map((node) => (
    <StripItem key={node._id} node={node} onPick={pick} />
  ));

  /*
    Not a category, on purpose.

    Deals are a state a product is in, not a shelf it sits on: the same laptop
    is on offer this week and not next, and filing it under a "Hot Deals"
    department would take it out of Laptops while the offer lasts. The page
    already gathers them by discount, so this is a link to that page — and the
    one item in the row allowed to shout, because a row of identical grey
    words is a row nothing stands out in.
  */
  items.push(
    <li key="deals">
      <Link
        to="/deals"
        /* The `!` is load-bearing. A scoped `a { color }` rule in the theme
           beats a plain utility class on specificity, and this link came out
           near-white on white — invisible, and only visible as such once the
           component was rendered rather than typechecked. The nav row above
           marks its Deals link the same way, for the same reason. */
        className="block py-2.5 px-1 font-bold uppercase tracking-wide whitespace-nowrap !text-[var(--brand-accent)] border-b-2 border-transparent hover:!border-[var(--brand-accent)] transition-all"
      >
        {t("Hot Deals")}
      </Link>
    </li>
  );

  /* A full-width, zero-height item: the only thing in a flex row that can say
     "everything after me starts a new line". Marked so the measurement above
     skips it — it is 100% wide by definition and would swamp any sum. */
  if (splitAt !== null && splitAt > 0 && splitAt < items.length) {
    items.splice(
      splitAt,
      0,
      <li
        key="break"
        data-bar-break=""
        aria-hidden="true"
        className="basis-full h-0 p-0 m-0"
      />
    );
  }

  return (
    <ul
      ref={rowRef}
      /* The starting size, and the one that stands if the measurement never
         runs. The hook writes an inline size, which wins over this. */
      className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-0 text-[12px]"
    >
      {items}
    </ul>
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
          {node.label}
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
