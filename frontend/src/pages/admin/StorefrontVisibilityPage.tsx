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
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
}

/** One draggable row. */
const SortableRow: React.FC<{
  row: Row;
  isAr: boolean;
  onToggle: (id: string, field: "isActive" | "showInMenu", value: boolean) => void;
}> = ({ row, isAr, onToggle }) => {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
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
        <div className="w-9 h-9 rounded-lg bg-[var(--bg)] border border-[var(--border)] shrink-0" />
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

      <label
        className={`flex items-center gap-1.5 text-[11px] cursor-pointer shrink-0 ${
          row.parentCategory ? "opacity-40" : "text-[var(--text-muted)]"
        }`}
        title={
          row.parentCategory
            ? t("visibility.subInFlyout", "Shown inside its parent's menu")
            : undefined
        }
      >
        <input
          type="checkbox"
          checked={row.showInMenu !== false}
          onChange={(e) => onToggle(row._id, "showInMenu", e.target.checked)}
          className="w-4 h-4 accent-[var(--brand-primary)]"
        />
        {t("visibility.inMenu", "In menu")}
      </label>
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

  const toggle = (id: string, field: "isActive" | "showInMenu", value: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r._id === id ? { ...r, [field]: value } : r))
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
            "off keeps it browsable but takes it out of the top menu. Sub-categories always appear inside their parent's menu."
          )}
        </p>
      </div>
    </div>
  );
};

export default StorefrontVisibilityPage;
