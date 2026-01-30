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
import { downloadCsv, getExportPages } from "../../lib/exporters";

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
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bars3Icon className="w-5 h-5 text-gray-600" />
          </button>

          {/* Current Date */}
          <div className="text-sm text-gray-600">{currentDate}</div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          <ThemeToggle showLabel={false} />
          {(currentExport || fallbackExport) && (
            <button
              onClick={handleExport}
              className="px-3 py-2 text-sm bg-[#002B5B] text-white rounded-lg hover:bg-[#001a3d] transition-colors"
              disabled={exporting}
            >
              {exporting ? t("admin.exporting") : t("admin.exportCsv")}
            </button>
          )}
          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name || "Admin"}
                </p>
                <p className="text-xs text-gray-500">{user?.role || "Admin"}</p>
              </div>
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <UserCircleIcon className="w-6 h-6 text-gray-600" />
              </div>
              <ChevronDownIcon className="w-4 h-4 text-gray-600" />
            </button>
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border">
                <div className="py-1">
                  <Link to="/account">
                    <button className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <UserCircleIcon className="w-4 h-4" />
                      <span>{t("admin.profile")}</span>
                    </button>
                  </Link>
                  <div className="border-t border-gray-100"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
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
