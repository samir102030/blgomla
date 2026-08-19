import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import type { Category } from "../../types/category.type";

/** Parent id whether the field arrives populated or as a raw id. */
const parentIdOf = (c: Category): string | null => {
  const parent = c.parentCategory;
  if (!parent) return null;
  return typeof parent === "string" ? parent : parent._id || null;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** The category whose products are moving. */
  source: Category;
  categories: Category[];
  onMoved: () => void;
}

/**
 * Move every product out of one category and into another.
 *
 * Asks the server for the count before it writes anything, so the confirmation
 * names a real number rather than whatever the last listing happened to show —
 * with subcategories included the figure is usually much larger than the count
 * beside the row, and that is exactly the case where a surprise is expensive.
 */
const MoveCategoryProductsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  source,
  categories,
  onMoved,
}) => {
  const { t, i18n } = useTranslation();
  const label = (c: { name?: string; nameAr?: string }) =>
    (i18n.language === "ar" && c.nameAr ? c.nameAr : c.name) || "";

  const [targetId, setTargetId] = useState("");
  const [includeSubcategories, setIncludeSubcategories] = useState(true);
  const [preview, setPreview] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [moving, setMoving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setTargetId("");
      setPreview(null);
      setSearch("");
      setIncludeSubcategories(true);
    }
  }, [isOpen]);

  /**
   * Everything the source could move into, shown with its full path.
   *
   * The source itself is out, and so is anything beneath it when subcategories
   * are included — moving a branch into its own child is the one target the
   * server refuses, and offering it only to be told no is a worse experience
   * than not offering it.
   */
  const options = useMemo(() => {
    const byId = new Map((categories || []).map((c) => [c._id, c]));
    const isBeneathSource = (c: Category) => {
      let parent = parentIdOf(c);
      let guard = 0;
      while (parent && guard++ < 10) {
        if (parent === source._id) return true;
        parent = byId.get(parent) ? parentIdOf(byId.get(parent)!) : null;
      }
      return false;
    };
    const trail = (c: Category): string => {
      const names: string[] = [];
      let parent = parentIdOf(c);
      let guard = 0;
      while (parent && guard++ < 10) {
        const p = byId.get(parent);
        if (!p) break;
        names.unshift(label(p));
        parent = parentIdOf(p);
      }
      return names.length ? `${names.join(" › ")} › ` : "";
    };

    const term = search.trim().toLowerCase();
    return (categories || [])
      .filter((c) => !c.deleted && c._id !== source._id)
      .filter((c) => !(includeSubcategories && isBeneathSource(c)))
      .map((c) => ({ id: c._id, path: `${trail(c)}${label(c)}` }))
      .filter((o) => !term || o.path.toLowerCase().includes(term))
      .sort((a, b) => a.path.localeCompare(b.path));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, source._id, includeSubcategories, search, i18n.language]);

  // Ask what would move, whenever the choice that determines it changes.
  useEffect(() => {
    if (!isOpen || !targetId) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    axiosInstance
      .post(`/categories/${source._id}/move-products`, {
        targetCategoryId: targetId,
        includeSubcategories,
        dryRun: true,
      })
      .then(({ data }) => !cancelled && setPreview(data?.count ?? 0))
      .catch(() => !cancelled && setPreview(null))
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, [isOpen, targetId, includeSubcategories, source._id]);

  const move = async () => {
    if (!targetId) return;
    setMoving(true);
    try {
      const { data } = await axiosInstance.post(
        `/categories/${source._id}/move-products`,
        { targetCategoryId: targetId, includeSubcategories }
      );
      toast.success(
        t("Moved {{count}} products to {{target}}", {
          count: data?.moved ?? 0,
          target: data?.target?.name || "",
        })
      );
      onMoved();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("Could not move the products"));
    } finally {
      setMoving(false);
    }
  };

  if (!isOpen) return null;

  const targetPath = options.find((o) => o.id === targetId)?.path || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">{t("Move products")}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100"
            aria-label={t("Close")}
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-3 text-sm">
            <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 font-medium">
              {label(source)}
            </span>
            <ArrowRightIcon className="w-4 h-4 text-gray-400 shrink-0 rtl:rotate-180" />
            <span
              className={`px-3 py-1.5 rounded-lg font-medium truncate ${
                targetPath
                  ? "bg-[var(--brand-primary)]/10 text-[var(--brand-accent)]"
                  : "bg-gray-50 text-gray-400"
              }`}
            >
              {targetPath || t("Choose a category")}
            </span>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSubcategories}
              onChange={(e) => setIncludeSubcategories(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
            />
            <span className="text-sm text-gray-700">
              {t("Include subcategories")}
              <span className="block text-xs text-gray-400">
                {t("Products filed under this category's subcategories move too.")}
              </span>
            </span>
          </label>

          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search categories")}
              className="w-full mb-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
            />
            <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
              {options.length === 0 ? (
                <p className="px-3 py-6 text-sm text-gray-400 text-center">
                  {t("No categories")}
                </p>
              ) : (
                options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setTargetId(o.id)}
                    className={`w-full text-start px-3 py-2 text-sm transition-colors ${
                      targetId === o.id
                        ? "bg-[var(--brand-primary)]/10 text-[var(--brand-accent)] font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {o.path}
                  </button>
                ))
              )}
            </div>
          </div>

          {targetId && (
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5 text-sm">
              {checking ? (
                <span className="text-gray-500">{t("Checking…")}</span>
              ) : preview === null ? (
                <span className="text-red-600">{t("Could not read the count")}</span>
              ) : preview === 0 ? (
                <span className="text-gray-500">{t("Nothing to move — this category is empty.")}</span>
              ) : (
                <span className="text-gray-800">
                  {t("{{count}} products will move. This cannot be undone.", {
                    count: preview,
                  })}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
          >
            {t("Cancel")}
          </button>
          <button
            onClick={move}
            disabled={!targetId || moving || checking || !preview}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--brand-accent)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {moving ? t("Moving…") : t("Move products")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveCategoryProductsModal;
