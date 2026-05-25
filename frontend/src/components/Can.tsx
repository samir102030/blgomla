import React from "react";
import { useTranslation } from "react-i18next";
import { useCan } from "../lib/permissions";

/**
 * Conditionally render children when the current user holds the permission.
 * `perm` may be a single key or an array (any-of).
 */
export const Can: React.FC<{
  perm: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ perm, fallback = null, children }) => {
  const can = useCan();
  return <>{can(perm) ? children : fallback}</>;
};

/**
 * Route/section guard: renders children only if permitted, otherwise a
 * friendly "no access" panel (keeps the dashboard chrome intact).
 */
export const RequirePermission: React.FC<{
  perm: string | string[];
  children: React.ReactNode;
}> = ({ perm, children }) => {
  const { t } = useTranslation();
  const can = useCan();
  if (can(perm)) return <>{children}</>;
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-14 h-14 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-[var(--text)]">
        {t("You don't have access to this page")}
      </h2>
      <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">
        {t("Ask an administrator to grant you the required permission.")}
      </p>
    </div>
  );
};

export default Can;
