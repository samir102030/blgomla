import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useStudentStore, type StudentCategory } from "../../../stores/student.store";
import { Card, Field, PageHead, btnGhost, btnPrimary, inputCls, useLocalName } from "./shared";

/**
 * The student section's own departments.
 *
 * Not a selection from the shop's catalogue — a tree of its own, built here.
 * The two catalogues describe different things: one is a wholesale electronics
 * shop, the other is what an engineering student needs for a term, and the
 * departments that make sense for one are noise in the other.
 *
 * The list is shown as an indented tree rather than a flat table because a
 * department's meaning is its position: "Kits" under "Lab" is a different
 * thing from "Kits" at the top, and a table would hide the difference.
 */

interface Draft {
  _id?: string;
  name: string;
  nameAr: string;
  parentCategory: string;
  order: number;
  active: boolean;
}

const EMPTY: Draft = { name: "", nameAr: "", parentCategory: "", order: 0, active: true };

const StudentsCategoriesPage: React.FC = () => {
  const { t } = useTranslation();
  const localName = useLocalName();
  const { catalogCategories, loading, saving, fetchCatalogCategories, saveCategory, deleteCategory } =
    useStudentStore();

  const [draft, setDraft] = useState<Draft>(EMPTY);

  useEffect(() => {
    fetchCatalogCategories();
  }, [fetchCatalogCategories]);

  /** Depth-first, so the indent in the list is the shape of the tree. */
  const ordered = useMemo(() => {
    const byParent = new Map<string, StudentCategory[]>();
    for (const c of catalogCategories) {
      const key = c.parentCategory ? String(c.parentCategory) : "root";
      byParent.set(key, [...(byParent.get(key) || []), c]);
    }
    const out: Array<StudentCategory & { depth: number }> = [];
    const walk = (key: string, depth: number) => {
      for (const node of (byParent.get(key) || []).sort(
        (a, b) => a.order - b.order || a.name.localeCompare(b.name),
      )) {
        out.push({ ...node, depth });
        walk(String(node._id), depth + 1);
      }
    };
    walk("root", 0);
    return out;
  }, [catalogCategories]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const done = await saveCategory({
      ...(draft._id ? { _id: draft._id } : {}),
      name: draft.name.trim(),
      nameAr: draft.nameAr.trim(),
      parentCategory: draft.parentCategory || null,
      order: Number(draft.order) || 0,
      active: draft.active,
    });
    if (done) {
      toast.success(draft._id ? t("Department updated.") : t("Department added."));
      setDraft(EMPTY);
    }
  };

  const onRemove = async (category: StudentCategory) => {
    if (!window.confirm(t("Remove this department?") as string)) return;
    if (await deleteCategory(category._id)) toast.success(t("Department removed."));
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <PageHead
        title={t("Departments")}
        description={t(
          "The student section's own departments — nothing to do with the shop's catalogue. Products are filed under them, and a department shows everything beneath it.",
        )}
      />

      <Card title={draft._id ? t("Edit department") : t("New department")}>
        <form onSubmit={onSubmit}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-4">
            <Field label={t("Name (English)")}>
              <input
                className={inputCls}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Lab equipment"
              />
            </Field>
            <Field label={t("Name (Arabic)")}>
              <input
                className={inputCls}
                value={draft.nameAr}
                onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })}
                placeholder="أدوات معمل"
              />
            </Field>
            <Field label={t("Sits under")} hint={t("Leave empty for a top-level department.")}>
              <select
                className={inputCls}
                value={draft.parentCategory}
                onChange={(e) => setDraft({ ...draft, parentCategory: e.target.value })}
              >
                <option value="">{t("Top level")}</option>
                {ordered
                  .filter((c) => c._id !== draft._id)
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {"— ".repeat(c.depth)}
                      {localName(c)}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label={t("Order")} hint={t("Lower numbers come first.")}>
              <input
                type="number"
                className={inputCls}
                value={draft.order}
                onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })}
              />
            </Field>
          </div>

          <label className="flex items-center gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              className="w-5 h-5 accent-[var(--brand-primary)]"
            />
            <span className="text-sm font-semibold text-[var(--text)]">{t("Shown on the section")}</span>
          </label>

          <div className="flex gap-3">
            <button type="submit" disabled={saving || !draft.name.trim()} className={btnPrimary}>
              {saving ? t("Saving…") : draft._id ? t("Save department") : t("Add department")}
            </button>
            {draft._id && (
              <button type="button" onClick={() => setDraft(EMPTY)} className={btnGhost}>
                {t("Cancel")}
              </button>
            )}
          </div>
        </form>
      </Card>

      <Card title={`${t("Departments")} · ${catalogCategories.length}`}>
        {!ordered.length && !loading && (
          <p className="text-sm text-[var(--text-muted)]">
            {t("No departments yet. The section needs at least one before a product can be filed.")}
          </p>
        )}

        <div className="divide-y divide-[var(--border)]">
          {ordered.map((c) => (
            <div key={c._id} className="flex flex-wrap items-center gap-3 py-3">
              <span style={{ paddingInlineStart: c.depth * 22 }} className="flex items-center gap-2">
                {c.depth > 0 && <span className="text-[var(--text-subtle)]">└</span>}
                <span className="text-sm font-semibold text-[var(--text)]">{localName(c)}</span>
              </span>

              <span className="text-xs px-2 py-1 rounded bg-[var(--surface-2)] text-[var(--text-muted)] font-mono">
                {c.productCount ?? 0} {t("products")}
              </span>

              {!c.active && (
                <span className="text-xs px-2 py-1 rounded bg-[var(--surface-2)] text-[var(--text-muted)]">
                  {t("Hidden")}
                </span>
              )}

              <div className="ms-auto flex gap-3">
                <button
                  onClick={() =>
                    setDraft({
                      _id: c._id,
                      name: c.name,
                      nameAr: c.nameAr || "",
                      parentCategory: c.parentCategory ? String(c.parentCategory) : "",
                      order: c.order,
                      active: c.active,
                    })
                  }
                  className="text-sm text-[var(--brand-primary)] hover:underline"
                >
                  {t("Edit")}
                </button>
                <button onClick={() => onRemove(c)} className="text-sm text-[var(--danger)] hover:underline">
                  {t("Remove")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default StudentsCategoriesPage;
