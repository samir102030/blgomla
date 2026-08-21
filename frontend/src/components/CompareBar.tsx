import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCompareStore } from "../stores/compare.store";

// Floating bar that appears once the shopper has products queued to compare.
const CompareBar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const ids = useCompareStore((s) => s.ids);
  const clear = useCompareStore((s) => s.clear);

  if (ids.length === 0 || location.pathname === "/compare") return null;

  return (
    <div style={{ bottom: "calc(1rem + var(--mobile-nav-h))" }} className="fixed left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-lg px-4 py-3">
        <span className="text-sm font-medium text-[var(--text)]">
          {t("{{count}} selected to compare", { count: ids.length })}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={clear}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] underline"
          >
            {t("Clear")}
          </button>
          <Link
            to="/compare"
            className="rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold px-4 py-2 hover:bg-[var(--brand-primary-hover)] transition-colors"
          >
            {t("Compare")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CompareBar;
