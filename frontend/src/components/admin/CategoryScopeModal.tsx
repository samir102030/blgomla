import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";

type Row = {
  _id: string;
  name: string;
  nameAr?: string;
  parentCategory?: { _id: string } | string | null;
  sortOrder?: number;
};

type Props = {
  userId: string;
  userLabel: string;
  current: string[];
  onClose: () => void;
  onSaved: (next: string[]) => void;
};

const idOf = (v: Row["parentCategory"]) =>
  !v ? null : typeof v === "string" ? v : v._id;

/**
 * Which parts of the catalogue an account is responsible for.
 *
 * Ticking a category takes everything under it — that is what the server does
 * with the list, and showing the tree indented is what makes it obvious. An
 * empty list is not "nothing": it is the unrestricted account every
 * administrator is, so the dialog says so rather than leaving it to be guessed.
 */
const CategoryScopeModal: React.FC<Props> = ({ userId, userLabel, current, onClose, onSaved }) => {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";

  const [rows, setRows] = useState<Row[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set(current));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/categories", { params: { includeHidden: true } })
      .then(({ data }) => {
        if (!cancelled) setRows(data.data || []);
      })
      .catch(() => {
        if (!cancelled) toast.error(t("Could not load the categories"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  /** Roots first, each followed by its own descendants, indented by depth. */
  const ordered = useMemo(() => {
    const childrenOf = new Map<string, Row[]>();
    for (const row of rows) {
      const key = idOf(row.parentCategory) || "";
      if (!childrenOf.has(key)) childrenOf.set(key, []);
      childrenOf.get(key)!.push(row);
    }
    for (const list of childrenOf.values()) {
      list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
    }
    const out: Array<Row & { depth: number }> = [];
    const walk = (parent: string, depth: number) => {
      for (const row of childrenOf.get(parent) || []) {
        out.push({ ...row, depth });
        walk(row._id, depth + 1);
      }
    };
    walk("", 0);
    return out;
  }, [rows]);

  const term = filter.trim().toLowerCase();
  const visible = term
    ? ordered.filter((r) => `${r.name} ${r.nameAr || ""}`.toLowerCase().includes(term))
    : ordered;

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const categoryScope = [...picked];
      await axiosInstance.put(`/users/categoryScope/${userId}`, { categoryScope });
      toast.success(
        categoryScope.length
          ? t("Saved — this account now works in {{count}} category branch(es).", { count: categoryScope.length })
          : t("Saved — this account can work anywhere in the catalogue."),
      );
      onSaved(categoryScope);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("Could not save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
          <div>
            <h3 className="text-lg font-bold text-[var(--text)]">
              {ar ? "الأقسام المسؤول عنها" : "Categories in their charge"}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{userLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)]">
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="border-b border-[var(--border)] p-4">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={ar ? "دوّر على قسم…" : "Find a category…"}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40"
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {ar
              ? "اختيار قسم بياخد كل اللي تحته. من غير أي اختيار، الحساب بيشتغل في الكتالوج كله."
              : "Ticking a category takes everything under it. With nothing ticked, the account works across the whole catalogue."}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="p-4 text-sm text-[var(--text-muted)]">{t("Loading...", "Loading…")}</p>
          ) : (
            <ul>
              {visible.map((row) => (
                <li key={row._id}>
                  <label
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--surface-2)]"
                    style={{ paddingInlineStart: `${8 + row.depth * 18}px` }}
                  >
                    <input
                      type="checkbox"
                      checked={picked.has(row._id)}
                      onChange={() => toggle(row._id)}
                      className="h-4 w-4 rounded border-[var(--border)] text-[var(--brand-primary)]"
                    />
                    <span className={`text-sm ${row.depth === 0 ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]"}`}>
                      {ar && row.nameAr ? row.nameAr : row.name}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--border)] p-4">
          <span className="text-sm text-[var(--text-muted)]">
            {picked.size
              ? ar
                ? `${picked.size} قسم مختار`
                : `${picked.size} selected`
              : ar
                ? "الكتالوج كله"
                : "The whole catalogue"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              {ar ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? (ar ? "بيحفظ…" : "Saving…") : ar ? "احفظ" : "Save"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CategoryScopeModal;
