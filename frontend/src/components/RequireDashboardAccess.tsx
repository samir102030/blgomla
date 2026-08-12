import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUserStore } from "../stores/user.store";
import { useCan } from "../lib/permissions";

/**
 * Gate for the whole dashboard tree.
 *
 * Individual pages already wrap themselves in <RequirePermission>, but the
 * routes themselves were mounted bare: `/dashboard/*` rendered the admin
 * layout for anyone who typed the URL, logged in or not. The API refuses the
 * data, so nothing leaked, but a signed-out visitor got the full back-office
 * chrome and a screen of failed requests.
 *
 * Roles are accepted alongside the permission because `permissions` is only
 * populated by the login response — a session persisted from before that
 * field existed would otherwise lock a real admin out of their own dashboard.
 */
const DASHBOARD_ROLES = ["admin", "super_admin", "store"];

export const RequireDashboardAccess: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useUserStore((s) => s.user);
  const can = useCan();

  // Signed out — send them to login and come back here afterwards.
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const allowed =
    can("dashboard.view") || DASHBOARD_ROLES.includes(user.role || "");

  // Signed in but not staff. Render a message rather than redirecting, so a
  // customer who followed a stale link isn't bounced somewhere confusing.
  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <div className="w-14 h-14 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--text-muted)]"
          >
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
  }

  return <>{children}</>;
};

export default RequireDashboardAccess;
