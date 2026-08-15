import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

export interface Crumb {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: Crumb[];
  /** Muted colours flip when the trail sits on the dark brand canvas. */
  onInk?: boolean;
  className?: string;
}

/**
 * The trail back up the page. Separators are drawn, not typed: the pages that
 * had one wrote "/" between <li>s and spaced them with space-x-*, which is a
 * physical margin — in Arabic the gaps collapsed onto the wrong side and the
 * slash pointed the wrong way down the trail.
 */
const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, onInk = false, className = "" }) => {
  const { t } = useTranslation();
  if (!items.length) return null;

  return (
    <nav aria-label={t("Breadcrumb")} className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
        {items.map((crumb, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && (
                <ChevronRightIcon
                  className="w-3.5 h-3.5 flex-none rtl:rotate-180 opacity-50"
                  aria-hidden="true"
                />
              )}
              {last || !crumb.to ? (
                <span
                  aria-current={last ? "page" : undefined}
                  className={`font-medium truncate max-w-[16rem] ${
                    onInk ? "text-[var(--on-ink)]" : "text-[var(--text)]"
                  }`}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.to}
                  className={`transition-colors hover:text-[var(--brand-primary)] ${
                    onInk ? "text-[var(--on-ink-muted)]" : "text-[var(--text-muted)]"
                  }`}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
