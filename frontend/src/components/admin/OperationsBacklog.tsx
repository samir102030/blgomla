import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../../lib/axios";

interface Backlog {
  ordersToFulfill: number;
  ordersAging: number;
  returnsPending: number;
  productApprovals: number;
  lowStock: number;
  outOfStock: number;
  unansweredQuestions: number;
  brandRequests: number;
  categoryRequests: number;
  vendorApprovals: number;
  noResultSearches7d: number;
}

interface Tile {
  key: keyof Backlog;
  label: string;
  to: string;
  tone: "red" | "amber" | "blue";
  sub?: (b: Backlog) => string;
}

// Order matters: most time-sensitive first.
const TILES: Tile[] = [
  {
    key: "ordersToFulfill",
    label: "Orders to fulfill",
    to: "/dashboard/order",
    tone: "red",
    sub: (b) => (b.ordersAging > 0 ? `${b.ordersAging} older than 48h` : ""),
  },
  { key: "returnsPending", label: "Returns to review", to: "/dashboard/returns", tone: "amber" },
  { key: "vendorApprovals", label: "Vendor approvals", to: "/dashboard/vendors", tone: "blue" },
  { key: "productApprovals", label: "Product approvals", to: "/dashboard/approvals", tone: "blue" },
  { key: "outOfStock", label: "Out of stock", to: "/dashboard/inventory", tone: "red" },
  { key: "lowStock", label: "Low stock", to: "/dashboard/inventory", tone: "amber" },
  { key: "unansweredQuestions", label: "Unanswered questions", to: "/dashboard/products", tone: "amber" },
  { key: "brandRequests", label: "Brand requests", to: "/dashboard/requests", tone: "blue" },
  { key: "categoryRequests", label: "Category requests", to: "/dashboard/requests", tone: "blue" },
  { key: "noResultSearches7d", label: "No-result searches (7d)", to: "/dashboard/visitors", tone: "amber" },
];

const toneClasses: Record<Tile["tone"], string> = {
  red: "border-red-200 dark:border-red-900/40 text-red-600",
  amber: "border-amber-200 dark:border-amber-900/40 text-amber-600",
  blue: "border-blue-200 dark:border-blue-900/40 text-blue-600",
};

// "Needs attention" backlog for the admin home — turns scattered queues into a
// single daily to-do list. Renders nothing when the queue is clear.
const OperationsBacklog: React.FC = () => {
  const { t } = useTranslation();
  const [backlog, setBacklog] = useState<Backlog | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get<{ backlog: Backlog }>(
          "/analytics/backlog"
        );
        if (!cancelled) setBacklog(data.backlog);
      } catch {
        if (!cancelled) setBacklog(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !backlog) return null;

  const active = TILES.filter((tile) => (backlog[tile.key] || 0) > 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          📋 {t("Needs attention")}
        </h2>
      </div>
      {active.length === 0 ? (
        <p className="text-sm text-emerald-600">
          ✅ {t("All clear — nothing waiting on you.")}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {active.map((tile) => {
            const sub = tile.sub?.(backlog);
            return (
              <Link
                key={`${tile.key}-${tile.to}`}
                to={tile.to}
                className={`rounded-xl border bg-white dark:bg-gray-900/40 p-4 hover:shadow-sm transition-shadow ${toneClasses[tile.tone]}`}
              >
                <div className="text-2xl font-extrabold">{backlog[tile.key]}</div>
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1">
                  {t(tile.label)}
                </div>
                {sub ? (
                  <div className="text-[11px] mt-1 opacity-80">{t(sub)}</div>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OperationsBacklog;
