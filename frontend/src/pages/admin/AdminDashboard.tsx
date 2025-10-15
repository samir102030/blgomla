import React, { useEffect } from "react";
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

const AdminDashboard: React.FC = () => {
  const { user } = useUserStore();
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
    } else if (user?.role === "admin") {
      // admin dashboard - backend should return platform-wide stats
      fetchDashboardStats().catch(() => {});
      fetchVendors({ page: 1, limit: 10 }).catch(() => {});
    }
  }, [user, fetchDashboardStats, fetchVendorStore, fetchVendors]);

  const retry = () => {
    clearError();
    if (user?.role === "store") {
      fetchVendorStore().catch(() => {});
      fetchDashboardStats().catch(() => {});
    } else if (user?.role === "admin") {
      fetchDashboardStats().catch(() => {});
      fetchVendors({ page: 1, limit: 10 }).catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user?.role === "admin" ? "Admin Dashboard" : "Store Dashboard"}
            </h1>
            <p className="text-gray-600 mt-1">
              Welcome back! Here's what's happening with your{" "}
              {user?.role === "admin" ? "platform" : "store"}.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm">
              <span className="text-sm text-gray-500">Last updated:</span>
              <span className="text-sm font-medium ml-2">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="text-red-500 mr-3">
                  <svg
                    className="w-6 h-6"
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
                  <p className="text-red-800 font-medium">Error loading data</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
              <div className="space-x-2">
                <button
                  onClick={retry}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => clearError()}
                  className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold mt-1">
                  ${dashboardStats?.totalRevenue?.toLocaleString() || "0"}
                </p>
              </div>
              <div className="bg-blue-400 bg-opacity-30 p-3 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <ArrowUpIcon className="w-4 h-4 text-green-300 mr-1" />
              <span className="text-sm text-blue-100">
                {dashboardStats?.salesChange || "0%"} from last month
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">
                  Total Orders
                </p>
                <p className="text-2xl font-bold mt-1">
                  {dashboardStats?.totalOrders || 0}
                </p>
              </div>
              <div className="bg-green-400 bg-opacity-30 p-3 rounded-lg">
                <ClipboardDocumentListIcon className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <ArrowUpIcon className="w-4 h-4 text-green-300 mr-1" />
              <span className="text-sm text-green-100">Active orders</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">
                  Total Customers
                </p>
                <p className="text-2xl font-bold mt-1">
                  {dashboardStats?.totalUsers || 0}
                </p>
              </div>
              <div className="bg-purple-400 bg-opacity-30 p-3 rounded-lg">
                <UsersIcon className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <ArrowUpIcon className="w-4 h-4 text-green-300 mr-1" />
              <span className="text-sm text-purple-100">New this month</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">
                  Total Products
                </p>
                <p className="text-2xl font-bold mt-1">
                  {dashboardStats?.totalProducts || 0}
                </p>
              </div>
              <div className="bg-orange-400 bg-opacity-30 p-3 rounded-lg">
                <ShoppingBagIcon className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <ArrowUpIcon className="w-4 h-4 text-green-300 mr-1" />
              <span className="text-sm text-orange-100">In stock</span>
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
                  Revenue Overview
                </h3>
                <p className="text-sm text-gray-500">Monthly revenue trends</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Revenue</span>
              </div>
            </div>
            <div className="h-64 flex items-end justify-between space-x-2">
              {/* Simple bar chart placeholder */}
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t w-full mb-2 transition-all hover:from-blue-600 hover:to-blue-500"
                    style={{
                      height: `${Math.random() * 200 + 50}px`,
                      minHeight: "20px",
                    }}
                  ></div>
                  <span className="text-xs text-gray-500">
                    {new Date(0, i).toLocaleString("default", {
                      month: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Top Products
                </h3>
                <p className="text-sm text-gray-500">Best performing items</p>
              </div>
              <ChartBarIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {dashboardStats?.topProducts &&
              dashboardStats.topProducts.length > 0 ? (
                dashboardStats.topProducts.map((p: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Hide image and show fallback icon
                              const img = e.currentTarget as HTMLImageElement;
                              img.style.display = "none";
                              const fallback =
                                img.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="w-full h-full flex items-center justify-center text-blue-600"
                          style={{ display: p.image ? "none" : "flex" }}
                        >
                          <ShoppingBagIcon className="w-5 h-5" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {p.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {p.units || 0} sold
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        ${p.sales || 0}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    No product data available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Admin-only sections */}
        {user?.role === "admin" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Best Sellers for Admin */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Best Sellers
                  </h3>
                  <p className="text-sm text-gray-500">Top performing stores</p>
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
                          {s.purchases || 0} sales
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <StarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      No seller data available
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
                    Product Overview
                  </h3>
                  <p className="text-sm text-gray-500">
                    Platform product statistics
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
                              ID: {p.id || p._id}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            ${p.price || 0}
                          </p>
                          <p className="text-xs text-gray-500">
                            {p.quantity || 0} in stock
                          </p>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8">
                    <ShoppingBagIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      No product data available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
