import React, { useMemo, useState } from "react";
import {
  UserCircleIcon,
  Bars3Icon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useUserStore } from "../../stores/user.store";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ThemeToggle from "../ThemeToggle";
import AdminLanguageToggle from "../AdminLanguageToggle";
import { downloadCsv, getExportPages } from "../../lib/exporters";
import NotificationBell from "../NotificationBell";

interface AdminHeaderProps {
  onMenuClick: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ onMenuClick }) => {
  const { t, i18n } = useTranslation();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { user, logout } = useUserStore();
  const location = useLocation();

  const exportPages = useMemo(
    () => getExportPages((user?.role as any) || "admin"),
    [user?.role],
  );

  const currentExport = useMemo(() => {
    const matches = exportPages.filter((page) =>
      location.pathname.startsWith(page.path),
    );
    return matches.sort((a, b) => b.path.length - a.path.length)[0];
  }, [exportPages, location.pathname]);

  const fallbackExport = useMemo(() => {
    if (!location.pathname.startsWith("/dashboard")) return null;
    return {
      fetcher: async () => ({
        filename: "export.csv",
        rows: [["Message"], ["No export data available"]],
      }),
    };
  }, [location.pathname]);

  const handleLogout = async () => await logout();

  const handleExport = async () => {
    const exporter = currentExport || fallbackExport;
    if (!exporter || exporting) return;
    setExporting(true);
    try {
      const result = await exporter.fetcher();
      downloadCsv(result.filename, result.rows);
    } catch (error) {
      console.error("Failed to export page data:", error);
    } finally {
      setExporting(false);
    }
  };

  const currentDate = new Date().toLocaleDateString(
    i18n.language === "ar" ? "ar-SA" : "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  return (
    <header className="bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-3">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
            aria-label={t('admin.toggleSidebar')}
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <div className="text-sm text-[var(--text-muted)] truncate">
            {currentDate}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {(currentExport || fallbackExport) && (
            <button
              onClick={handleExport}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-white shadow-sm hover:opacity-95 transition disabled:opacity-50"
              style={{ background: "var(--brand-gradient)" }}
              disabled={exporting}
            >
              {exporting ? t("admin.exporting") : t("admin.exportCsv")}
            </button>
          )}

          {/* Icon cluster — uniform circular buttons, grouped together so the
              notification badge doesn't visually leak into the export CTA. */}
          <div className="flex items-center gap-1 ltr:ml-1 rtl:mr-1">
            <NotificationBell />
            <ThemeToggle showLabel={false} />
            <AdminLanguageToggle />
          </div>

          {/* Divider before the user chip */}
          <span className="hidden sm:block w-px h-6 bg-[var(--border)] mx-1" aria-hidden="true" />

          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1 sm:pl-1 sm:pr-2 rounded-md hover:bg-[var(--surface-2)] transition-colors"
            >
              <div className="hidden sm:block ltr:text-right rtl:text-left leading-tight">
                <p className="text-sm font-medium text-[var(--text)]">
                  {user?.name || t("admin.fallbackName")}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] capitalize">
                  {t(`admin.role.${user?.role || "admin"}`, {
                    defaultValue: (user?.role || "admin").replace(/_/g, " "),
                  })}
                </p>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm"
                style={{ background: "var(--brand-gradient)" }}
              >
                {(user?.name || user?.email || "A").charAt(0).toUpperCase()}
              </div>
              <ChevronDownIcon className="hidden sm:block w-4 h-4 text-[var(--text-subtle)]" />
            </button>
            {showUserDropdown && (
              <div className="absolute ltr:right-0 rtl:left-0 mt-2 w-52 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-3 border-b border-[var(--border)]">
                  <p className="text-sm font-semibold text-[var(--text)] truncate">
                    {user?.name || t("admin.fallbackName")}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {user?.email}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--text-subtle)] uppercase tracking-wide">
                    {t(`admin.role.${user?.role || "admin"}`, {
                      defaultValue: (user?.role || "admin").replace(/_/g, " "),
                    })}
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    to="/account"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
                    <UserCircleIcon className="w-4 h-4" />
                    <span>{t("admin.profile")}</span>
                  </Link>
                  <Link
                    to="/"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
                    🏠 <span>{t('admin.backToSite')}</span>
                  </Link>
                </div>
                <div className="border-t border-[var(--border)] py-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-[var(--surface-2)]"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    <span>{t("account.logout")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
