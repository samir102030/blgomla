import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUpIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  ChartBarIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { useVendorStore } from "../../stores/vendor.store";
import { useUserStore } from "../../stores/user.store";
import { useAnalyticsStore } from "../../stores/analytics.store";
import {
  downloadCombinedCsv,
  downloadCsv,
  getExportPages,
} from "../../lib/exporters";

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const isAdminLike =
    user?.role === "admin" || user?.role === "super_admin";
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [combineFiles, setCombineFiles] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { salesTrend, topProducts, fetchSalesTrend, fetchTopProducts } =
    useAnalyticsStore();
  const {
    dashboardStats,
    loading,
    error,
    fetchDashboardStats,
    fetchVendorStore,
    fetchVendors,
    clearError,
  } = useVendorStore();

  useEffect(() => {
    // If logged in user is a store owner, fetch their store & stats.
    // If admin, fetch platform-level stats and vendors list.
    if (user?.role === "store") {
      fetchVendorStore().catch(() => {});
      fetchDashboardStats().catch(() => {});
    } else if (isAdminLike) {
      // admin dashboard - backend should return platform-wide stats
      fetchDashboardStats().catch(() => {});
      fetchVendors({ page: 1, limit: 10 }).catch(() => {});
    }
  }, [user, fetchDashboardStats, fetchVendorStore, fetchVendors]);

  useEffect(() => {
    fetchSalesTrend("monthly", "1year").catch(() => {});
    fetchTopProducts(5).catch(() => {});
  }, [fetchSalesTrend, fetchTopProducts]);

  const revenueTrend = useMemo(() => {
    if (salesTrend && salesTrend.length > 0) return salesTrend;
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const label = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}`;
      return { date: label, sales: 0, orders: 0 };
    });
    return months;
  }, [salesTrend]);

  const exportPages = useMemo(
    () => getExportPages((user?.role as any) || "admin"),
    [user?.role],
  );

  useEffect(() => {
    setSelectedPageIds(exportPages.map((page) => page.id));
  }, [exportPages]);

  const toggleSelectedPage = (id: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleBulkExport = async () => {
    if (selectedPageIds.length === 0 || exporting) return;
    setExporting(true);
    try {
      const selectedPages = exportPages.filter((page) =>
        selectedPageIds.includes(page.id),
      );
      const results = await Promise.all(
        selectedPages.map(async (page) => {
          const data = await page.fetcher();
          return { label: page.label, ...data };
        }),
      );

      if (combineFiles) {
        downloadCombinedCsv("dashboard-export.csv", results);
      } else {
        results.forEach((result) => downloadCsv(result.filename, result.rows));
      }
      setShowExportModal(false);
    } catch (error) {
      console.error("Failed to export dashboard data:", error);
    } finally {
      setExporting(false);
    }
  };

  const retry = () => {
    clearError();
    if (user?.role === "store") {
      fetchVendorStore().catch(() => {});
      fetchDashboardStats().catch(() => {});
    } else if (isAdminLike) {
      fetchDashboardStats().catch(() => {});
      fetchVendors({ page: 1, limit: 10 }).catch(() => {});
    }
  };

  if (loading && !dashboardStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isAdminLike ? t("admin.dashboard") : t("admin.storeDashboard")}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {t("admin.welcomeBack")} {t("admin.hereWhatsHappening")}{" "}
              {isAdminLike ? t("admin.platform") : t("admin.store")}.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-[#002B5B] text-white px-4 py-2 rounded-lg hover:bg-[#001a3d] transition-colors text-xs sm:text-sm whitespace-nowrap"
            >
              Export Dashboard
            </button>
            <div className="bg-white px-3 sm:px-4 py-2 rounded-lg shadow-sm whitespace-nowrap">
              <span className="text-xs sm:text-sm text-gray-500">
                {t("admin.lastUpdated")}
              </span>
              <span className="text-xs sm:text-sm font-medium ml-2">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="text-red-500 flex-shrink-0 mt-0.5">
                  <svg
                    className="w-5 sm:w-6 h-5 sm:h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-red-800 font-medium text-sm">
                    {t("admin.errorLoadingData")}
                  </p>
                  <p className="text-red-600 text-xs">{error}</p>
                </div>
              </div>
              <div className="space-x-2 flex">
                <button
                  onClick={retry}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors whitespace-nowrap"
                >
                  {t("admin.retry")}
                </button>
                <button
                  onClick={() => clearError()}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                >
                  {t("admin.dismiss")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 sm:p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-blue-100 text-xs sm:text-sm font-medium">
                  {t("admin.totalRevenue")}
                </p>
                <p className="text-lg sm:text-2xl font-bold mt-1 truncate">
                  ${dashboardStats?.totalRevenue?.toLocaleString() || "0"}
                </p>
              </div>
              <div className="bg-blue-400 bg-opacity-30 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <CurrencyDollarIcon className="w-5 sm:w-6 h-5 sm:h-6" />
              </div>
            </div>
            <div className="flex items-center mt-3 sm:mt-4">
              <ArrowUpIcon className="w-3 sm:w-4 h-3 sm:h-4 text-green-300 mr-1 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-blue-100 truncate">
                {dashboardStats?.salesChange || "0%"} {t("admin.fromLastMonth")}
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 sm:p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-green-100 text-xs sm:text-sm font-medium">
                  {t("admin.totalOrders")}
                </p>
                <p className="text-lg sm:text-2xl font-bold mt-1">
                  {dashboardStats?.totalOrders || 0}
                </p>
              </div>
              <div className="bg-green-400 bg-opacity-30 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <ClipboardDocumentListIcon className="w-5 sm:w-6 h-5 sm:h-6" />
              </div>
            </div>
            <div className="flex items-center mt-3 sm:mt-4">
              <ArrowUpIcon className="w-3 sm:w-4 h-3 sm:h-4 text-green-300 mr-1 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-green-100">
                {t("admin.activeOrders")}
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 sm:p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-purple-100 text-xs sm:text-sm font-medium">
                  {t("admin.totalCustomers")}
                </p>
                <p className="text-lg sm:text-2xl font-bold mt-1">
                  {dashboardStats?.totalUsers || 0}
                </p>
              </div>
              <div className="bg-purple-400 bg-opacity-30 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <UsersIcon className="w-5 sm:w-6 h-5 sm:h-6" />
              </div>
            </div>
            <div className="flex items-center mt-3 sm:mt-4">
              <ArrowUpIcon className="w-3 sm:w-4 h-3 sm:h-4 text-green-300 mr-1 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-purple-100">
                {t("admin.newThisMonth")}
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 sm:p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-orange-100 text-xs sm:text-sm font-medium">
                  {t("admin.totalProducts")}
                </p>
                <p className="text-lg sm:text-2xl font-bold mt-1">
                  {dashboardStats?.totalProducts || 0}
                </p>
              </div>
              <div className="bg-orange-400 bg-opacity-30 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <ShoppingBagIcon className="w-5 sm:w-6 h-5 sm:h-6" />
              </div>
            </div>
            <div className="flex items-center mt-3 sm:mt-4">
              <ArrowUpIcon className="w-3 sm:w-4 h-3 sm:h-4 text-green-300 mr-1 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-orange-100">
                {t("admin.inStock")}
              </span>
            </div>
          </div>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t("admin.revenueOverview")}
                </h3>
                <p className="text-sm text-gray-500">
                  {t("admin.monthlyRevenueTrends")}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  {t("admin.revenue")}
                </span>
              </div>
            </div>
            <div className="h-64">
              {revenueTrend.length > 0 ? (
                <div className="flex items-end justify-between space-x-2 h-full">
                  {revenueTrend.slice(-12).map((point, index) => {
                    const maxSales = Math.max(
                      ...revenueTrend.map((item) => item.sales),
                    );
                    const height =
                      maxSales > 0 ? (point.sales / maxSales) * 100 : 0;
                    const label = point.date.includes("-")
                      ? point.date.split("-")[1]
                      : point.date;
                    return (
                      <div
                        key={`${point.date}-${index}`}
                        className="flex-1 flex flex-col items-center justify-end h-full"
                      >
                        <div className="relative w-full flex items-end justify-center">
                          <div
                            className={`rounded-t w-full transition-all group ${
                              point.sales > 0
                                ? "bg-gradient-to-t from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500"
                                : "bg-gray-200 hover:bg-gray-300"
                            }`}
                            style={{ height: `${Math.max(height, 5)}%` }}
                          >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-gray-900 text-white px-2 py-1 rounded shadow whitespace-nowrap">
                              {t("admin.revenue")}: ${point.sales.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 mt-2">
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t("admin.topProducts")}
                </h3>
                <p className="text-sm text-gray-500">
                  {t("admin.bestPerformingItems")}
                </p>
              </div>
              <ChartBarIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {topProducts && topProducts.length > 0 ? (
                topProducts.map((p, i) => (
                  <div
                    key={`${p.name}-${i}`}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <ShoppingBagIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {p.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {p.units} {t("admin.sold")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        ${p.sales.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    {t("admin.noProductData")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Admin-only sections */}
        {isAdminLike && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Best Sellers for Admin */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t("admin.bestSellers")}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t("admin.topPerformingStores")}
                  </p>
                </div>
                <StarIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                {dashboardStats?.bestSellers &&
                dashboardStats.bestSellers.length > 0 ? (
                  dashboardStats.bestSellers.map((s: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                          <StarIcon className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {s.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {s.categories || "Store"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          ${s.total || s.revenue || 0}
                        </p>
                        <p className="text-xs text-gray-500">
                          {s.purchases || 0} {t("admin.sales")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <StarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      {t("admin.noSellerData")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Product Overview for Admin */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t("admin.productOverview")}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t("admin.platformProductStatistics")}
                  </p>
                </div>
                <ShoppingBagIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                {dashboardStats?.productOverview &&
                dashboardStats.productOverview.length > 0 ? (
                  dashboardStats.productOverview
                    .slice(0, 5)
                    .map((p: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                            <ShoppingBagIcon className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {p.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {t("admin.id")}: {p.id || p._id}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            ${p.price || 0}
                          </p>
                          <p className="text-xs text-gray-500">
                            {p.quantity || 0} {t("admin.inStock")}
                          </p>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8">
                    <ShoppingBagIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      {t("admin.noProductData")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl relative">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Export Dashboard Data
              </h2>
              <p className="text-sm text-gray-600">
                Select the pages you want to export.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
              {exportPages.map((page) => (
                <label
                  key={page.id}
                  className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedPageIds.includes(page.id)}
                    onChange={() => toggleSelectedPage(page.id)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-800">{page.label}</span>
                </label>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={combineFiles}
                  onChange={(e) => setCombineFiles(e.target.checked)}
                  className="h-4 w-4 text-blue-600"
                />
                Combine into single CSV
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkExport}
                  disabled={exporting || selectedPageIds.length === 0}
                  className="px-4 py-2 rounded-lg bg-[#002B5B] text-white hover:bg-[#001a3d] disabled:opacity-50"
                >
                  {exporting ? "Exporting..." : "Download"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
