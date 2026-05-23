import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../../lib/axios";

interface PricingRow {
  productId: string;
  name: string;
  price: number;
  competitorMin: number;
  competitorAvg: number;
  competitorCount: number;
  premiumPct: number;
  position: "above" | "below" | "at";
  suggestedPrice: number;
}

// Admin card: products priced above the cheapest competitor (chance to win
// sales) using the existing competitorPrices data. Renders nothing if there's
// no competitor data yet.
const PricingInsights: React.FC = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get<{ insights: PricingRow[] }>(
          "/products/pricing-insights"
        );
        if (!cancelled) setRows(data.insights || []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || rows.length === 0) return null;

  const fmt = (n: number) => n.toLocaleString("en-EG", { maximumFractionDigits: 2 });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mt-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        💰 {t("Pricing intelligence")}
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        {t("Products priced above the cheapest competitor — consider repricing")}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 pr-3">{t("Product")}</th>
              <th className="py-2 px-3">{t("Your price")}</th>
              <th className="py-2 px-3">{t("Competitor min")}</th>
              <th className="py-2 px-3">{t("Vs market")}</th>
              <th className="py-2 px-3">{t("Suggested")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.productId} className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-2 pr-3 text-gray-800 dark:text-gray-200 truncate max-w-[220px]">
                  {r.name}
                </td>
                <td className="py-2 px-3">{fmt(r.price)}</td>
                <td className="py-2 px-3">{fmt(r.competitorMin)}</td>
                <td className="py-2 px-3">
                  <span
                    className={
                      r.position === "above"
                        ? "text-red-600 font-semibold"
                        : r.position === "below"
                        ? "text-emerald-600 font-semibold"
                        : "text-gray-500"
                    }
                  >
                    {r.premiumPct > 0 ? "+" : ""}
                    {r.premiumPct}%
                  </span>
                </td>
                <td className="py-2 px-3 font-semibold text-[var(--brand-primary)]">
                  {r.position === "above" ? fmt(r.suggestedPrice) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PricingInsights;
