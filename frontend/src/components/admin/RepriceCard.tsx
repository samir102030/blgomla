import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { ArrowPathIcon, ArrowUturnLeftIcon, TagIcon } from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";
import { useCategoryStore } from "../../stores/category.store";

/**
 * Move every price in one department by a percentage.
 *
 * The same job scripts/adjustPrices.mjs does, with the same safety, because
 * that safety is the whole reason a price change is not as casual as a stock
 * change: a percentage cannot be undone by arithmetic. Down 12% does not
 * cancel up 12%, and the rounding loses a little more each way. So the server
 * writes down what the prices were before it touches them, and the undo
 * replays those numbers rather than dividing.
 *
 * Nothing happens until the preview has said how many products and what the
 * totals become. A price rise is not a control anybody should be able to press
 * without having read a number first.
 */

interface Preview {
  count: number;
  cap: number;
  before: number;
  after: number;
  last: {
    id: string;
    categoryName: string;
    percent: number;
    count: number;
    at: string;
    by?: string;
  } | null;
}

const money = (n: number) => n.toLocaleString("en-US");

const RepriceCard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");
  const categories = useCategoryStore((state) => state.categories);

  const [categoryId, setCategoryId] = useState("");
  const [percent, setPercent] = useState(12);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  /** Roots only: a bar of three hundred names is not a chooser. */
  const roots = useMemo(
    () =>
      (categories || [])
        .filter((c) => !c.parentCategory && !c.deleted)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categories]
  );

  /** The server's rule, so the field cannot ask for something Apply refuses. */
  const sane = Number.isFinite(percent) && percent !== 0 && percent > -100 && percent <= 100;

  const load = useCallback(async () => {
    if (!categoryId || !sane) {
      setPreview(null);
      return;
    }
    try {
      const { data } = await axiosInstance.get("/products/audit/reprice", {
        params: { categoryId, percent },
      });
      setPreview(data);
    } catch {
      setPreview(null);
    }
  }, [categoryId, percent, sane]);

  /*
    A beat before asking.

    The preview counts every priced product in the branch, and the field fires
    on each keystroke — typing "12" into Electronics was two full scans of
    5,656 products for one number nobody had finished typing yet.
  */
  useEffect(() => {
    const timer = window.setTimeout(load, 350);
    return () => window.clearTimeout(timer);
  }, [load]);

  const apply = async () => {
    if (!preview?.count) return;
    setBusy(true);
    try {
      const { data } = await axiosInstance.post("/products/audit/reprice", {
        categoryId,
        percent,
      });
      toast.success(
        t("reprice.done", "{{count}} prices moved in {{name}}", {
          count: data.changed,
          name: data.categoryName,
        })
      );
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("reprice.failed", "Couldn't change the prices"));
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    setBusy(true);
    try {
      const { data } = await axiosInstance.post("/products/audit/reprice/undo");
      toast.success(
        t("reprice.undone", "{{count}} prices put back", { count: data.restored })
      );
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("reprice.failed", "Couldn't change the prices"));
    } finally {
      setBusy(false);
    }
  };

  const tooMany = !!preview && preview.count > preview.cap;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-[var(--brand-accent)] shrink-0">
          <TagIcon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text)]">
            {t("reprice.title", "Move a department's prices")}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {t(
              "reprice.subtitle",
              "Every priced product in the department and everything under it. The old prices are kept, so this can be put back."
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] min-w-[13rem]"
        >
          <option value="">{t("reprice.pick", "Choose a department…")}</option>
          {roots.map((c) => (
            <option key={c._id} value={c._id}>
              {isAr && c.nameAr ? c.nameAr : c.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.5"
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value) || 0)}
            className="w-20 px-2 py-2 text-sm rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] tabular-nums"
          />
          <span className="text-sm text-[var(--text-muted)]">%</span>
        </div>

        <button
          type="button"
          onClick={apply}
          disabled={busy || !sane || !preview?.count || tooMany}
          className="inline-flex items-center gap-2 bg-[var(--brand-primary)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {busy && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
          {t("reprice.apply", "Apply")}
        </button>

        {preview?.last && (
          <button
            type="button"
            onClick={undo}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40"
          >
            <ArrowUturnLeftIcon className="w-4 h-4" />
            {t("reprice.undo", "Undo {{percent}}% on {{name}}", {
              percent: preview.last.percent,
              name: preview.last.categoryName,
            })}
          </button>
        )}
      </div>

      {!sane && percent !== 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          {t("reprice.range", "A percentage above -100 and up to 100.")}
        </p>
      )}

      {preview && (
        <p
          className={`text-xs ${tooMany ? "text-[var(--danger,#b91c1c)]" : "text-[var(--text-muted)]"}`}
        >
          {tooMany
            ? t(
                "reprice.tooMany",
                "{{count}} products — this button stops at {{cap}}. Use the script for a run that size.",
                { count: preview.count, cap: preview.cap }
              )
            : t(
                "reprice.preview",
                "{{count}} products · {{before}} → {{after}} EGP",
                {
                  count: preview.count,
                  before: money(preview.before),
                  after: money(preview.after),
                }
              )}
        </p>
      )}
    </div>
  );
};

export default RepriceCard;
