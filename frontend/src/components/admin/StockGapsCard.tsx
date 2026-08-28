import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { ArchiveBoxIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";

/**
 * Priced products that read "Out of Stock", and one button that fixes them.
 *
 * A thousand of them arrived with an import that had no stock column — 231 in
 * Used, 153 in Peripherals, and on down every shelf — and every one shows a
 * customer a product they cannot buy. The same job can be done from
 * scripts/adjustPrices.mjs, which wants a terminal and a database URL. This is
 * the difference between a thing that is fixable and a thing that is fixed.
 *
 * Only the ones at zero move. A product somebody has counted keeps its figure,
 * and a product with no price stays unavailable on purpose — availability is
 * read off stock, so stocking one would put it on sale for nothing. Those are
 * counted separately here rather than hidden, because they are a real job too,
 * just a different one: they need a price, not a quantity.
 */

interface Gaps {
  empty: number;
  unpriced: number;
  total: number;
}

const StockGapsCard: React.FC = () => {
  const { t } = useTranslation();
  const [gaps, setGaps] = useState<Gaps | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [quantity, setQuantity] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/products/audit/stock-gaps");
      setGaps({ empty: data.empty, unpriced: data.unpriced, total: data.total });
    } catch {
      setGaps(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const restock = async () => {
    if (!gaps?.empty) return;
    setWorking(true);
    try {
      const { data } = await axiosInstance.post("/products/audit/restock", { quantity });
      toast.success(
        t("stock.done", "{{count}} products are back on the shelf", {
          count: data.changed,
        })
      );
      load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || t("stock.failed", "Couldn't set the stock")
      );
    } finally {
      setWorking(false);
    }
  };

  if (loading || !gaps) return null;
  if (!gaps.empty && !gaps.unpriced) return null;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
          <ArchiveBoxIcon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text)]">
            {t("stock.title", "Out of stock")}{" "}
            <span className="tabular-nums">{gaps.empty}</span>
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {gaps.unpriced > 0
              ? t(
                  "stock.subtitleWithUnpriced",
                  "Priced products with nothing in stock. {{n}} more have no price — those need a price, not a quantity.",
                  { n: gaps.unpriced }
                )
              : t("stock.subtitle", "Priced products with nothing in stock.")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 ms-auto">
        <label className="text-xs text-[var(--text-muted)]">
          {t("stock.quantity", "Units each")}
        </label>
        <input
          type="number"
          min={1}
          max={100000}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          className="w-20 px-2 py-1.5 text-sm rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] tabular-nums"
        />
        <button
          type="button"
          onClick={restock}
          disabled={working || !gaps.empty}
          className="inline-flex items-center gap-2 bg-[var(--brand-primary)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {working && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
          {t("stock.fill", "Put them back on the shelf")}
        </button>
      </div>
    </div>
  );
};

export default StockGapsCard;
