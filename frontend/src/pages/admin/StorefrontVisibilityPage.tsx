import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bars3Icon, XMarkIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";

type Kind = "categories" | "brands";

interface Row {
  _id: string;
  name: string;
  nameAr?: string;
  image?: string;
  logo?: string;
  parentCategory?: { _id: string; name?: string; nameAr?: string } | null;
  sortOrder?: number;
  isActive?: boolean;
  showInMenu?: boolean;
  showInBar?: boolean;
  barOrder?: number;
}

/**
 * One department on the strip, in the little panel that arranges it.
 *
 * Deliberately not a row of the list below. The list is three hundred and
 * forty-nine categories deep and arranging a bar of twelve by dragging across
 * it is not arranging, it is hunting — so the twelve get their own strip at the
 * top, in the order they appear on the shop, short enough to see at once.
 */
const BarChip: React.FC<{
  row: Row;
  isAr: boolean;
  onRemove: (id: string) => void;
}> = ({ row, isAr, onRemove }) => {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `bar-${row._id}` });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-2 ps-2 pe-1 py-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)]"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-[var(--text-subtle)] touch-none"
        title={t("visibility.drag", "Drag to reorder")}
      >
        <Bars3Icon className="w-4 h-4" />
      </button>
      <span className="text-sm text-[var(--text)] whitespace-nowrap">
        {isAr && row.nameAr ? row.nameAr : row.name}
      </span>
      <button
        type="button"
        onClick={() => onRemove(row._id)}
        aria-label={t("visibility.removeFromBar", "Take off the bar")}
        title={t("visibility.removeFromBar", "Take off the bar")}
        className="w-5 h-5 flex items-center justify-center rounded-full text-[var(--text-subtle)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
      >
        <XMarkIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/** One draggable row. */
const SortableRow: React.FC<{
  row: Row;
  isAr: boolean;
  depth: number;
  /** Brands have no department strip, so they get no switch for it. */
  showBarToggle: boolean;
  onToggle: (
    id: string,
    field: "isActive" | "showInMenu" | "showInBar",
    value: boolean
  ) => void;
}> = ({ row, isAr, depth, showBarToggle, onToggle }) => {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    // Indented by depth so the list reads as the tree it is. The menu orders
    // each set of children among themselves, so a row's position matters
    // relative to its siblings, not to the list as a whole.
    marginInlineStart: `${depth * 1.5}rem`,
  };

  const label = isAr && row.nameAr ? row.nameAr : row.name;
  const img = row.image || row.logo;
  const hidden = row.isActive === false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl ${
        hidden ? "opacity-55" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t("visibility.drag", "Drag to reorder")}
        className="cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text)] px-1 shrink-0 touch-none"
      >
        ⠿
      </button>

      {img ? (
        <img
          src={img}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-9 h-9 rounded-lg object-contain bg-[var(--bg)] shrink-0"
        />
      ) : (
        /* An empty square and a missing picture looked the same, which made a
           column of them impossible to read: you could not tell the categories
           that need a photograph from the ones whose photograph is pale. */
        <div
          title={t("visibility.noImage", "No picture yet")}
          className="w-9 h-9 rounded-lg bg-[var(--bg)] border border-dashed border-[var(--border)] shrink-0 flex items-center justify-center text-[var(--text-subtle)]"
        >
          <PhotoIcon className="w-4 h-4" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text)] truncate">{label}</p>
        {row.parentCategory && (
          <p className="text-[11px] text-[var(--text-muted)] truncate">
            {t("visibility.under", "under")}{" "}
            {isAr && row.parentCategory.nameAr
              ? row.parentCategory.nameAr
              : row.parentCategory.name}
          </p>
        )}
      </div>

      <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={row.isActive !== false}
          onChange={(e) => onToggle(row._id, "isActive", e.target.checked)}
          className="w-4 h-4 accent-[var(--brand-primary)]"
        />
        {t("visibility.live", "Live")}
      </label>

      {/* Applies at every level now that the menu is a cascade: off takes a
          root out of the bar, and takes a subcategory out of the dropdown it
          would have appeared in. It used to be greyed out on children, from
          when only roots had a menu slot to lose. */}
      <label className="flex items-center gap-1.5 text-[11px] cursor-pointer shrink-0 text-[var(--text-muted)]">
        <input
          type="checkbox"
          checked={row.showInMenu !== false}
          onChange={(e) => onToggle(row._id, "showInMenu", e.target.checked)}
          className="w-4 h-4 accent-[var(--brand-primary)]"
        />
        {t("visibility.inMenu", "In menu")}
      </label>

      {/* The strip under the navbar. Unticked by default and deliberately so:
          it holds about nine, and its whole use is that it is shorter than the
          menu beside it. Drag order decides the order it appears in. */}
      {showBarToggle && (
        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer shrink-0 text-[var(--text-muted)]">
          <input
            type="checkbox"
            checked={row.showInBar === true}
            onChange={(e) => onToggle(row._id, "showInBar", e.target.checked)}
            className="w-4 h-4 accent-[var(--brand-accent)]"
          />
          {t("visibility.inBar", "In top bar")}
        </label>
      )}
    </div>
  );
};

const StorefrontVisibilityPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");

  const [kind, setKind] = useState<Kind>("categories");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    setLoading(true);
    setDirty(false);
    try {
      const { data } = await axiosInstance.get(`/storefront-visibility/${kind}`);
      setRows(data.items || []);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || t("visibility.loadFailed", "Couldn't load the list")
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [kind, t]);

  useEffect(() => {
    load();
  }, [load]);

  /*
    The strip, in the order the shop shows it.

    Derived from the same rows rather than held separately, so ticking "In top
    bar" on any row below puts it here and taking it off here unticks it there.
    Two lists that could disagree about the same flag is a bug waiting for
    somebody to find it.

    A department nobody has positioned carries 0, which sorts it first — right,
    because the alternative is a newly ticked one appearing at the end where
    nobody looks for it. This matches how the storefront sorts the strip.
  */
  const barRows = useMemo(
    () =>
      rows
        .filter((r) => r.showInBar === true)
        .sort(
          (a, b) =>
            (a.barOrder ?? 0) - (b.barOrder ?? 0) ||
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
            a.name.localeCompare(b.name)
        ),
    [rows]
  );

  /** Renumber the strip from an ordered list of ids, 1..n. */
  const applyBarOrder = (ordered: string[]) => {
    const position = new Map(ordered.map((id, index) => [id, index + 1]));
    setRows((prev) =>
      prev.map((r) =>
        position.has(r._id) ? { ...r, barOrder: position.get(r._id) } : r
      )
    );
    setDirty(true);
  };

  const handleBarDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = barRows.map((r) => r._id);
    const from = ids.indexOf(String(active.id).replace(/^bar-/, ""));
    const to = ids.indexOf(String(over.id).replace(/^bar-/, ""));
    if (from < 0 || to < 0) return;
    applyBarOrder(arrayMove(ids, from, to));
  };

  /*
    Taking one off does not just untick it — it renumbers the rest.

    Leaving the old positions behind works, because the sort only cares about
    order and not about the gaps. But the numbers are what the next reorder is
    built on, and a list numbered 1, 3, 4, 9 is one an operator will eventually
    see in an export and have to reason about. Cheap to keep tidy.
  */
  const removeFromBar = (id: string) => {
    const ordered = barRows.map((r) => r._id).filter((rowId) => rowId !== id);
    const position = new Map(ordered.map((rowId, index) => [rowId, index + 1]));
    setRows((prev) =>
      prev.map((r) => {
        if (r._id === id) return { ...r, showInBar: false, barOrder: 0 };
        return position.has(r._id) ? { ...r, barOrder: position.get(r._id) } : r;
      })
    );
    setDirty(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const from = prev.findIndex((r) => r._id === active.id);
      const to = prev.findIndex((r) => r._id === over.id);
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
    setDirty(true);
  };

  const toggle = (
    id: string,
    field: "isActive" | "showInMenu" | "showInBar",
    value: boolean
  ) => {
    // A newly ticked department joins the end of the strip rather than jumping
    // to the front of it: it is an addition, and where it goes is the next
    // thing the panel above lets you decide.
    const nextPosition =
      Math.max(0, ...barRows.map((r) => r.barOrder ?? 0)) + 1;

    setRows((prev) =>
      prev.map((r) =>
        r._id === id
          ? {
              ...r,
              [field]: value,
              ...(field === "showInBar"
                ? { barOrder: value ? nextPosition : 0 }
                : {}),
            }
          : r
      )
    );
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await axiosInstance.put(`/storefront-visibility/${kind}`, {
        items: rows.map((r) => ({
          _id: r._id,
          isActive: r.isActive !== false,
          showInMenu: r.showInMenu !== false,
          // Sent only for categories: the brands handler has no such field and
          // a stray one would be written to every brand row.
          ...(kind === "categories"
            ? { showInBar: r.showInBar === true, barOrder: r.barOrder ?? 0 }
            : {}),
        })),
      });
      toast.success(t("visibility.saved", "Saved — refresh the storefront to see it"));
      setDirty(false);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || t("visibility.saveFailed", "Save failed")
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * How deep each row sits, walked from its parent chain.
   *
   * The list arrives flat with only the immediate parent populated, so depth
   * has to be counted here. `seen` stops a broken chain from looping.
   */
  const depthById = useMemo(() => {
    const parentOf = new Map<string, string | null>(
      rows.map((r) => [r._id, r.parentCategory?._id || null])
    );
    const depths = new Map<string, number>();
    for (const row of rows) {
      let depth = 0;
      const seen = new Set<string>([row._id]);
      let parent = parentOf.get(row._id) || null;
      while (parent && !seen.has(parent)) {
        seen.add(parent);
        depth += 1;
        parent = parentOf.get(parent) || null;
      }
      depths.set(row._id, depth);
    }
    return depths;
  }, [rows]);

  const counts = useMemo(() => {
    const live = rows.filter((r) => r.isActive !== false).length;
    const inMenu = rows.filter(
      (r) => r.isActive !== false && r.showInMenu !== false && !r.parentCategory
    ).length;
    return { live, inMenu, total: rows.length };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            {t("visibility.title", "Storefront visibility")}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {t(
              "visibility.subtitle",
              "Choose what customers see, and in what order. Drag to arrange."
            )}
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="bg-[var(--brand-primary)] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {saving
            ? t("visibility.saving", "Saving…")
            : dirty
              ? t("visibility.save", "Save arrangement")
              : t("visibility.noChanges", "No changes")}
        </button>
      </div>

      {/* which list */}
      <div className="flex gap-2">
        {(["categories", "brands"] as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              kind === k
                ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]/40"
            }`}
          >
            {k === "categories"
              ? t("visibility.categories", "Categories")
              : t("visibility.brands", "Brands")}
          </button>
        ))}
      </div>

      {/* the strip, arranged on its own */}
      {kind === "categories" && !loading && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              {t("visibility.barTitle", "The bar under the menu")}
              <span className="ms-2 text-[var(--text-muted)] font-normal tabular-nums">
                {barRows.length}
              </span>
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {t(
                "visibility.barHint",
                "Drag to order it. The first 12 sit on the bar; the rest go under More."
              )}
            </p>
          </div>

          {barRows.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-2">
              {t(
                "visibility.barEmpty",
                "Nothing on it yet — tick “In top bar” on any category below."
              )}
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleBarDragEnd}
            >
              <SortableContext
                items={barRows.map((r) => `bar-${r._id}`)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex flex-wrap gap-2">
                  {barRows.map((row, index) => (
                    <React.Fragment key={row._id}>
                      {/* Where the bar starts its second row, and where More
                          begins — shown because twelve is not a number anybody
                          can count to reliably in a wrapped list of pills. */}
                      {index === 12 && (
                        <div className="basis-full flex items-center gap-2 pt-1">
                          <span className="h-px flex-1 bg-[var(--border)]" />
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {t("visibility.barUnderMore", "under More")}
                          </span>
                          <span className="h-px flex-1 bg-[var(--border)]" />
                        </div>
                      )}
                      <BarChip row={row} isAr={isAr} onRemove={removeFromBar} />
                    </React.Fragment>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3">
          <span>
            {t("visibility.total", "Total")}: <b className="text-[var(--text)]">{counts.total}</b>
          </span>
          <span>
            {t("visibility.live", "Live")}: <b className="text-[var(--text)]">{counts.live}</b>
          </span>
          {kind === "categories" && (
            <span>
              {t("visibility.inTopMenu", "In the top menu")}:{" "}
              <b className="text-[var(--text)]">{counts.inMenu}</b>
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand-primary)]" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-10 text-center">
          {t("visibility.empty", "Nothing here yet.")}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rows.map((r) => r._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {rows.map((row) => (
                <SortableRow
                  key={row._id}
                  row={row}
                  isAr={isAr}
                  depth={depthById.get(row._id) || 0}
                  showBarToggle={kind === "categories"}
                  onToggle={toggle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="text-xs text-[var(--text-muted)] bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 space-y-1">
        <p>
          <b className="text-[var(--text)]">{t("visibility.live", "Live")}</b> —{" "}
          {t(
            "visibility.liveHelp",
            "off hides it from the storefront completely, everywhere."
          )}
        </p>
        <p>
          <b className="text-[var(--text)]">{t("visibility.inMenu", "In menu")}</b> —{" "}
          {t(
            "visibility.inMenuHelp",
            "off keeps it browsable but takes it out of the category menu — a top-level one loses its slot in the bar, and a sub-category disappears from the dropdown it sits in, along with anything under it."
          )}
        </p>
      </div>
    </div>
  );
};

export default StorefrontVisibilityPage;
