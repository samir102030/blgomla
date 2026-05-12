import React from "react";
import { useReturnStore } from "../stores/return.store";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const AccountReturns: React.FC = () => {
  const { t } = useTranslation();
  const returns = useReturnStore((state) => state.returns);
  const loading = useReturnStore((state) => state.loading);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400";
      case "rejected": return "text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400";
      case "received": return "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400";
      case "refunded": return "text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-400";
      default: return "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return "✅";
      case "rejected": return "❌";
      case "received": return "📬";
      case "refunded": return "💸";
      default: return "⏳";
    }
  };

  if (loading && returns.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--brand-primary)] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">{t("account.myReturns", "My Returns")}</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">{t("account.returnsSubtitle", "Track the status of your return requests.")}</p>
      </div>

      {returns.length === 0 ? (
        <div className="bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] p-10 text-center">
          <span className="text-4xl">📭</span>
          <p className="text-sm text-[var(--text-muted)] mt-3">{t("account.noReturns", "No return requests yet.")}</p>
          <Link to="/products" className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-[var(--brand-primary)] hover:underline">{t("account.continueShopping", "Continue Shopping")} →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map((item) => {
            const orderId = typeof item.order === "string" ? item.order : item.order?._id;
            return (
              <div key={item._id} className="bg-[var(--surface-2)]/50 border border-[var(--border)] rounded-xl p-4 flex items-center gap-4 hover:border-[var(--brand-primary)]/30 transition-all">
                <div className="text-2xl shrink-0">{getStatusIcon(item.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[var(--text)] truncate">#{item._id.slice(-8).toUpperCase()}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(item.status)}`}>{item.status}</span>
                  </div>
                  <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                    {t("account.order", "Order")}: #{orderId?.slice(-8)?.toUpperCase() || "N/A"} • {item.createdAt?.slice(0, 10)}
                  </p>
                  {item.reason && <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">"{item.reason}"</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AccountReturns;
