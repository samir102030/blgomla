import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { axiosInstance } from "../../lib/axios";

/* ── Types mirroring the registry the API serves ── */
interface I18nLabel { en: string; ar: string }
interface RegistrySection {
  key: string;
  label: I18nLabel;
  hint?: I18nLabel;
  slots: string[];
  locked?: boolean;
}
interface RegistrySlot { key: string; label: I18nLabel }
interface Row { key: string; slot: string; enabled: boolean }

const PAGE = "home";

/* ── One draggable section card ── */
const SectionCard: React.FC<{
  row: Row;
  meta?: RegistrySection;
  lang: string;
  onToggle: (key: string) => void;
  onRemove: (key: string) => void;
}> = ({ row, meta, lang, onToggle, onRemove }) => {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.key });

  const label = meta ? (lang === "ar" ? meta.label.ar : meta.label.en) : row.key;
  const hint = meta?.hint ? (lang === "ar" ? meta.hint.ar : meta.hint.en) : "";
  const locked = meta?.locked;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-lg border bg-[var(--surface)] px-3 py-2.5 ${
        isDragging ? "opacity-40" : ""
      } ${row.enabled ? "border-[var(--border)]" : "border-dashed border-[var(--border)] opacity-60"}`}
    >
      {/* The drag handle is its own control so the buttons beside it stay
          clickable, and it is focusable so the whole board works from the
          keyboard: tab to a handle, space to lift, arrows to move. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t("layout.dragHandle", "Move section")}
        className="cursor-grab touch-none rounded p-1 text-[var(--text-subtle)] hover:bg-[var(--surface-2)] active:cursor-grabbing"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="6" cy="4" r="1.4" /><circle cx="10" cy="4" r="1.4" />
          <circle cx="6" cy="8" r="1.4" /><circle cx="10" cy="8" r="1.4" />
          <circle cx="6" cy="12" r="1.4" /><circle cx="10" cy="12" r="1.4" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-[var(--text)]">{label}</span>
          {locked && (
            <span className="shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-subtle)]">
              {t("layout.pinned", "مثبّت")}
            </span>
          )}
        </div>
        {hint && <p className="truncate text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>

      <button
        type="button"
        onClick={() => onToggle(row.key)}
        disabled={locked}
        className={`shrink-0 rounded px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
          row.enabled
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : "bg-[var(--surface-2)] text-[var(--text-muted)]"
        }`}
      >
        {row.enabled ? t("layout.on", "ظاهر") : t("layout.off", "مخفي")}
      </button>

      <button
        type="button"
        onClick={() => onRemove(row.key)}
        disabled={locked}
        aria-label={t("layout.remove", "Remove section")}
        className="shrink-0 rounded p-1 text-[var(--text-subtle)] hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};

/* ── A slot: a droppable region of the page ── */
const SlotColumn: React.FC<{
  slot: RegistrySlot;
  rows: Row[];
  registry: RegistrySection[];
  lang: string;
  onToggle: (key: string) => void;
  onRemove: (key: string) => void;
}> = ({ slot, rows, registry, lang, onToggle, onRemove }) => {
  const { t } = useTranslation();
  const label = lang === "ar" ? slot.label.ar : slot.label.en;

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
      <header className="mb-2.5 flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-[var(--text)]">{label}</h3>
        <span className="font-mono text-[11px] text-[var(--text-subtle)]" dir="ltr">
          {slot.key}
        </span>
      </header>

      <SortableContext items={rows.map((r) => r.key)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2" data-slot={slot.key}>
          {rows.map((row) => (
            <SectionCard
              key={row.key}
              row={row}
              meta={registry.find((s) => s.key === row.key)}
              lang={lang}
              onToggle={onToggle}
              onRemove={onRemove}
            />
          ))}
          {rows.length === 0 && (
            <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--text-subtle)]">
              {t("layout.emptySlot", "اسحب قسم هنا")}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
};

/* ═════════════════════ Page ═════════════════════ */
const LayoutPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";

  const [registry, setRegistry] = useState<RegistrySection[]>([]);
  const [slots, setSlots] = useState<RegistrySlot[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [version, setVersion] = useState<number>(0);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  const snapshot = (list: Row[]) =>
    list.map((r) => `${r.slot}:${r.key}:${r.enabled}`).join("|");
  const dirty = snapshot(rows) !== savedSnapshot;

  const load = async () => {
    setLoading(true);
    try {
      const [reg, layout] = await Promise.all([
        axiosInstance.get("/layouts/registry"),
        axiosInstance.get(`/layouts/${PAGE}/edit`),
      ]);
      setRegistry(reg.data.sections);
      setSlots(reg.data.slots);
      const list: Row[] = layout.data.sections.map((s: Row) => ({
        key: s.key,
        slot: s.slot,
        enabled: s.enabled,
      }));
      setRows(list);
      setVersion(layout.data.version);
      setSavedSnapshot(snapshot(list));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("layout.loadFailed", "تعذّر تحميل الترتيب"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before losing an unsaved arrangement to a closed tab.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const sensors = useSensors(
    // A small distance threshold so a click on the handle isn't read as a
    // drag, and touch gets a hold delay so the page can still be scrolled.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const unused = useMemo(
    () => registry.filter((s) => !rows.some((r) => r.key === s.key)),
    [registry, rows]
  );

  const slotOf = (key: string) => rows.find((r) => r.key === key)?.slot;

  const handleDragStart = (e: DragStartEvent) => setDragging(String(e.active.id));

  /** Moving across slots happens while hovering, so the card follows the cursor. */
  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    const from = slotOf(activeKey);
    // Hovering a card adopts that card's slot; hovering the empty area of a
    // slot uses the slot's own id.
    const to = slotOf(overKey) ?? (slots.some((s) => s.key === overKey) ? overKey : undefined);
    if (!from || !to || from === to) return;

    const meta = registry.find((s) => s.key === activeKey);
    if (meta && !meta.slots.includes(to)) return; // refuse before the drop

    setRows((prev) => prev.map((r) => (r.key === activeKey ? { ...r, slot: to } : r)));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    setRows((prev) => {
      const from = prev.findIndex((r) => r.key === active.id);
      const to = prev.findIndex((r) => r.key === over.id);
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
  };

  const addSection = (meta: RegistrySection) => {
    const slot = meta.slots[0];
    setRows((prev) => [...prev, { key: meta.key, slot, enabled: true }]);
    toast.success(t("layout.added", "اتضاف — اسحبه لمكانه"));
  };

  const toggle = (key: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, enabled: !r.enabled } : r)));

  const remove = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await axiosInstance.put(`/layouts/${PAGE}`, {
        sections: rows,
        version,
      });
      setVersion(data.version);
      setSavedSnapshot(snapshot(rows));
      toast.success(t("layout.saved", "اتحفظ — الصفحة الرئيسية اتحدثت"));
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;
      toast.error(message || t("layout.saveFailed", "تعذّر الحفظ"));
      if (status === 409) await load(); // someone else won; show their version
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm(t("layout.confirmReset", "ترجع للترتيب الأصلي؟"))) return;
    setSaving(true);
    try {
      await axiosInstance.post(`/layouts/${PAGE}/reset`);
      await load();
      toast.success(t("layout.wasReset", "رجع للترتيب الأصلي"));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("layout.resetFailed", "تعذّر الرجوع"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-[var(--text-muted)]">{t("common.loading", "بيحمّل…")}</p>;
  }

  const draggingMeta = registry.find((s) => s.key === dragging);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {t("layout.title", "ترتيب الصفحة الرئيسية")}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {t("layout.subtitle", "اسحب الأقسام عشان تغيّر ترتيبها أو تنقلها بين أماكن الصفحة.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {t("layout.unsaved", "فيه تعديلات لسه متحفظتش")}
            </span>
          )}
          <button
            type="button"
            onClick={reset}
            disabled={saving}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            {t("layout.reset", "الترتيب الأصلي")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="rounded-lg bg-[#002B5B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#001a3d] disabled:opacity-50"
          >
            {saving ? t("layout.saving", "بيحفظ…") : t("layout.save", "احفظ ونشر")}
          </button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
          <div className="flex flex-col gap-4">
            {slots.map((slot) => (
              <SlotColumn
                key={slot.key}
                slot={slot}
                rows={rows.filter((r) => r.slot === slot.key)}
                registry={registry}
                lang={lang}
                onToggle={toggle}
                onRemove={remove}
              />
            ))}
          </div>

          <aside className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <h3 className="mb-2 text-sm font-bold text-[var(--text)]">
              {t("layout.available", "أقسام متاحة")}
            </h3>
            {unused.length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--text-subtle)]">
                {t("layout.allUsed", "كل الأقسام مستخدمة")}
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {unused.map((meta) => (
                  <li key={meta.key}>
                    <button
                      type="button"
                      onClick={() => addSection(meta)}
                      className="flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-2.5 py-2 text-start hover:border-[var(--brand-accent)] hover:bg-[var(--surface-2)]"
                    >
                      <span className="text-lg leading-none text-[var(--text-subtle)]">+</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-[var(--text)]">
                          {lang === "ar" ? meta.label.ar : meta.label.en}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>

        {/* The card under the cursor, rendered above everything so it isn't
            clipped by a slot's own bounds while crossing between them. */}
        <DragOverlay>
          {dragging && draggingMeta ? (
            <div className="rounded-lg border border-[var(--brand-accent)] bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold text-[var(--text)] shadow-lg">
              {lang === "ar" ? draggingMeta.label.ar : draggingMeta.label.en}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default LayoutPage;
