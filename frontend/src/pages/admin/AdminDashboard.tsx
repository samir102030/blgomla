import React, { useEffect } from "react";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          <div className="flex items-center justify-between">
            <div>{error}</div>
            <div className="space-x-2">
              <button
                onClick={retry}
                className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm"
              >
                Retry
              </button>
              <button
                onClick={() => clearError()}
                className="px-3 py-1 bg-white border rounded text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top stat cards - use dashboardStats where available */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`bg-[#FAFAFA] rounded-xl p-6 border border-gray-100`}>
          <div className="flex items-start justify-between mb-4">
            <div
              className={`w-12 h-12 bg-[#009688] rounded-xl flex items-center justify-center text-white text-xl`}
            >
              🛍️
            </div>
            <div className="flex items-center space-x-1">
              <ArrowUpIcon className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">
                {/* change unavailable */}0%
              </span>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm font-medium text-[#9E9E9E] mb-1">
              Total Sales
            </p>
            <p className="text-2xl font-bold text-[#333333]">
              {dashboardStats?.totalRevenue
                ? `$${Number(dashboardStats.totalRevenue).toLocaleString()}`
                : "$0"}
            </p>
          </div>
        </div>

        <div className={`bg-[#FAFAFA] rounded-xl p-6 border border-gray-100`}>
          <div className="flex items-start justify-between mb-4">
            <div
              className={`w-12 h-12 bg-[#FFD600] rounded-xl flex items-center justify-center text-white text-xl`}
            >
              $
            </div>
            <div className="flex items-center space-x-1">
              <ArrowUpIcon className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">
                {/* change unavailable */}0%
              </span>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm font-medium text-[#9E9E9E] mb-1">
              Total Income
            </p>
            <p className="text-2xl font-bold text-[#333333]">
              {dashboardStats?.totalRevenue
                ? `$${Number(dashboardStats.totalRevenue).toLocaleString()}`
                : "$0"}
            </p>
          </div>
        </div>

        <div className={`bg-[#FAFAFA] rounded-xl p-6 border border-gray-100`}>
          <div className="flex items-start justify-between mb-4">
            <div
              className={`w-12 h-12 bg-[#9E9E9E] rounded-xl flex items-center justify-center text-white text-xl`}
            >
              📋
            </div>
            <div className="flex items-center space-x-1">
              <ArrowDownIcon className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-600">
                {/* change unavailable */}0%
              </span>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm font-medium text-[#9E9E9E] mb-1">
              Orders Paid
            </p>
            <p className="text-2xl font-bold text-[#333333]">
              {dashboardStats?.totalOrders ?? 0}
            </p>
          </div>
        </div>

        <div className={`bg-[#FAFAFA] rounded-xl p-6 border border-gray-100`}>
          <div className="flex items-start justify-between mb-4">
            <div
              className={`w-12 h-12 bg-[#002B5B] rounded-xl flex items-center justify-center text-white text-xl`}
            >
              👥
            </div>
            <div className="flex items-center space-x-1">
              <ArrowUpIcon className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">
                {/* change unavailable */}0%
              </span>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm font-medium text-[#9E9E9E] mb-1">
              Total Visitors
            </p>
            <p className="text-2xl font-bold text-[#333333]">
              {dashboardStats?.monthlyRevenue
                ? dashboardStats.monthlyRevenue
                : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Main charts and lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#FAFAFA] rounded-xl p-6 shadow-sm border border-[#9E9E9E]/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#333333]">
              Recent Order
            </h3>
            <button className="text-[#9E9E9E] hover:text-[#333333]">...</button>
          </div>
          <div className="h-64 relative">
            {/* Simple chart placeholder: if dashboardStats.chartPoints is provided, we could render it here. For now keep the SVG background but avoid dummy data. */}
            <svg
              className="w-full h-full"
              viewBox="0 0 400 200"
              preserveAspectRatio="none"
            >
              <defs>
                <pattern
                  id="grid2"
                  width="40"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 20"
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid2)" />
            </svg>

            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-[#9E9E9E] px-4">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct</span>
              <span>Nov</span>
              <span>Dec</span>
            </div>
          </div>
        </div>

        <div className="bg-[#FAFAFA] rounded-xl p-6 shadow-sm border border-[#9E9E9E]/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#333333]">
              Top Products
            </h3>
            <button className="text-sm text-[#002B5B] hover:text-[#001a3d]">
              View all ↗
            </button>
          </div>
          <div className="space-y-4">
            {dashboardStats &&
            (dashboardStats.totalProducts || dashboardStats.monthlyRevenue) ? (
              // If backend doesn't provide topProducts in stats, show nothing here
              (dashboardStats as any).topProducts?.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                      {p.image || "📦"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#333333]">
                        {p.name}
                      </p>
                      <p className="text-xs text-[#9E9E9E]">
                        {p.items || `${p.count || 0} Items`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs text-[#9E9E9E]">
                        {p.coupon || ""}
                      </span>
                      <span className="text-lg">{p.flag || ""}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-[#9E9E9E]">
                        {p.status || ""}
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-medium text-[#D32F2F]">
                          {p.discount || ""}
                        </span>
                        <span className="text-xs text-[#333333]">
                          {p.price ? `$${p.price}` : p.priceDisplay || ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">
                No top products data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Section - fallback to generic fields */}
      <div className="bg-[#FAFAFA] rounded-xl p-6 shadow-sm border border-[#9E9E9E]/20">
        <h3 className="text-lg font-semibold text-[#333333] mb-6">
          Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="mb-2">
              <span className="text-2xl font-bold text-[#333333]">
                {dashboardStats?.totalUsers ?? "N/A"}
              </span>
            </div>
            <div className="mb-2">
              <span className="text-sm text-[#9E9E9E]">Total Users</span>
            </div>
          </div>

          <div className="text-center">
            <div className="mb-2">
              <span className="text-2xl font-bold text-[#333333]">
                {dashboardStats?.totalOrders ?? 0}
              </span>
            </div>
            <div className="mb-2">
              <span className="text-sm text-[#9E9E9E]">Total Orders</span>
            </div>
          </div>

          <div className="text-center">
            <div className="mb-2">
              <span className="text-2xl font-bold text-[#333333]">
                {dashboardStats?.totalSales
                  ? `$${Number(dashboardStats.totalSales).toLocaleString()}`
                  : "$0"}
              </span>
            </div>
            <div className="mb-2">
              <span className="text-sm text-[#9E9E9E]">Total Sales</span>
            </div>
          </div>

          <div className="text-center">
            <div className="mb-2">
              <span className="text-2xl font-bold text-[#333333]">
                {dashboardStats?.totalPending ?? 0}
              </span>
            </div>
            <div className="mb-2">
              <span className="text-sm text-[#9E9E9E]">Total Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Countries, Best Sellers, Product Overview (driven by backend when available) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#FAFAFA] rounded-xl p-6 shadow-sm border border-[#9E9E9E]/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#333333]">
              Top Countries By Sales
            </h3>
            <button className="text-sm text-[#002B5B] hover:text-[#001a3d]">
              View all
            </button>
          </div>

          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl font-bold text-[#333333]">
                {dashboardStats?.totalSales
                  ? `$${Number(dashboardStats.totalSales).toLocaleString()}`
                  : "$0"}
              </span>
              <div className="flex items-center text-[#009688]">
                <ArrowUpIcon className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {dashboardStats?.salesChange || "0%"}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#9E9E9E]">Since last period</p>
          </div>

          <div className="space-y-3">
            {dashboardStats?.topCountries &&
            dashboardStats.topCountries.length > 0 ? (
              dashboardStats.topCountries.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-sm">{c.flag || "🏳️"}</span>
                    </div>
                    <span className="text-sm font-medium text-[#333333]">
                      {c.country}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-semibold text-[#333333]">
                      {c.sales ?? c.value ?? 0}
                    </span>
                    <div
                      className={`w-4 h-4 ${
                        c.trend === "up" ? "text-[#009688]" : "text-[#D32F2F]"
                      }`}
                    >
                      {c.trend === "up" ? (
                        <ArrowUpIcon className="w-4 h-4" />
                      ) : (
                        <ArrowDownIcon className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">
                No country data available
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#FAFAFA] rounded-xl p-6 shadow-sm border border-[#9E9E9E]/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#333333]">
              Best Shop Sellers
            </h3>
            <button className="text-sm text-[#002B5B] hover:text-[#001a3d]">
              View all ↗
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 pb-3 mb-4 border-b border-[#9E9E9E]/20 text-xs font-medium text-[#9E9E9E]">
            <div>Shop</div>
            <div>Categories</div>
            <div>Total</div>
            <div>Status</div>
          </div>

          <div className="space-y-4">
            {dashboardStats?.bestSellers &&
            dashboardStats.bestSellers.length > 0 ? (
              dashboardStats.bestSellers.map((s: any, idx: number) => (
                <div key={idx} className="grid grid-cols-4 gap-4 items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                      {s.avatar || "🏬"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#333333]">
                        {s.name}
                      </p>
                      <p className="text-xs text-[#9E9E9E]">
                        {s.purchases ? `${s.purchases} Purchases` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-[#9E9E9E]">
                    {s.categories || ""}
                  </div>
                  <div className="text-sm font-semibold text-[#333333]">
                    {s.total ?? s.revenue ?? "$0"}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-16 h-2 bg-[#9E9E9E]/20 rounded-full overflow-hidden`}
                    >
                      <div
                        className={`h-full bg-green-500 rounded-full`}
                        style={{ width: `${s.progress ?? 0}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-[#9E9E9E]">
                      {s.progress ?? 0}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">
                No best sellers data available
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#FAFAFA] rounded-xl p-6 shadow-sm border border-[#9E9E9E]/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#333333]">
              Product overview
            </h3>
            <button className="text-sm text-[#002B5B] hover:text-[#001a3d]">
              View all ↗
            </button>
          </div>

          <div className="grid grid-cols-7 gap-4 pb-3 mb-4 border-b border-[#9E9E9E]/20 text-xs font-medium text-[#9E9E9E]">
            <div>Name</div>
            <div>Product ID</div>
            <div>Price</div>
            <div>Quantity</div>
            <div>Sale</div>
            <div>Revenue</div>
            <div>Status</div>
          </div>

          <div className="space-y-4">
            {dashboardStats?.productOverview &&
            dashboardStats.productOverview.length > 0 ? (
              dashboardStats.productOverview.map((p: any, i: number) => (
                <div
                  key={i}
                  className="grid grid-cols-7 gap-4 items-center text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-sm">
                      {p.image || "📦"}
                    </div>
                    <span className="font-medium text-[#333333]">{p.name}</span>
                  </div>
                  <div className="text-[#9E9E9E]">{p.id || p._id}</div>
                  <div className="text-[#333333] font-medium">
                    {p.price ? `$${p.price}` : p.priceDisplay || "N/A"}
                  </div>
                  <div className="text-[#9E9E9E]">{p.quantity ?? 0}</div>
                  <div
                    className={`px-2 py-1 rounded text-xs ${
                      p.status === "On sale"
                        ? "bg-[#009688]/10 text-[#009688]"
                        : p.status === "---"
                        ? "text-[#9E9E9E]"
                        : "bg-[#FFD600]/10 text-[#333333]"
                    }`}
                  >
                    {p.status || "—"}
                  </div>
                  <div className="text-[#333333] font-medium">
                    {p.revenue ?? "-"}
                  </div>
                  <div className="text-[#673AB7] font-medium">
                    {p.rating ?? "-"}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">
                No product overview available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
