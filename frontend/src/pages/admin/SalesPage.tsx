import React, { useState, useEffect } from "react";
import {
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import { useAnalyticsStore } from "../../stores/analytics.store";

const SalesPage: React.FC = () => {
  const [dateRange, setDateRange] = useState("7days");
  const [chartPeriod, setChartPeriod] = useState("daily");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<
    "sales" | "products" | "transactions"
  >("sales");
  const {
    salesOverview,
    topProducts,
    recentTransactions,
    performanceMetrics,
    revenueBreakdown,
    salesTrend,
    loading,
    fetchSalesOverview,
    fetchTopProducts,
    fetchRecentTransactions,
    fetchPerformanceMetrics,
    fetchRevenueBreakdown,
    fetchSalesTrend,
  } = useAnalyticsStore();

  useEffect(() => {
    fetchSalesOverview(dateRange);
    fetchTopProducts();
    fetchRecentTransactions();
    fetchPerformanceMetrics();
    fetchRevenueBreakdown(dateRange);
    fetchSalesTrend(chartPeriod, dateRange);
  }, [
    dateRange,
    chartPeriod,
    fetchSalesOverview,
    fetchTopProducts,
    fetchRecentTransactions,
    fetchPerformanceMetrics,
    fetchRevenueBreakdown,
    fetchSalesTrend,
  ]);

  const salesData = [
    {
      period: "Current Period",
      sales: salesOverview ? `$${salesOverview.current.toFixed(2)}` : "$0.00",
      change: salesOverview
        ? `${salesOverview.changePercent.toFixed(1)}%`
        : "0.0%",
      isPositive: salesOverview ? salesOverview.changePercent >= 0 : true,
    },
    {
      period: "Previous Period",
      sales: salesOverview ? `$${salesOverview.previous.toFixed(2)}` : "$0.00",
      change: salesOverview
        ? `${salesOverview.changePercent.toFixed(1)}%`
        : "0.0%",
      isPositive: salesOverview ? salesOverview.changePercent >= 0 : true,
    },
    {
      period: "Change",
      sales: salesOverview ? `$${salesOverview.change.toFixed(2)}` : "$0.00",
      change: salesOverview
        ? `${salesOverview.changePercent.toFixed(1)}%`
        : "0.0%",
      isPositive: salesOverview ? salesOverview.changePercent >= 0 : true,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-[#009688]/10 text-[#009688]";
      case "pending":
        return "bg-[#FFD600]/10 text-[#333333]";
      case "refunded":
        return "bg-[#D32F2F]/10 text-[#D32F2F]";
      default:
        return "bg-[#9E9E9E]/10 text-[#9E9E9E]";
    }
  };

  const exportReport = () => {
    try {
      const reportData = [];

      // Add header
      reportData.push(["Sales Analytics Report"]);
      reportData.push(["Generated on", new Date().toLocaleString()]);
      reportData.push(["Date Range", dateRange]);
      reportData.push(["Chart Period", chartPeriod]);
      reportData.push([""]);

      // Sales Overview
      reportData.push(["SALES OVERVIEW"]);
      if (salesOverview) {
        reportData.push([
          "Current Period Sales",
          `$${salesOverview.current.toFixed(2)}`,
        ]);
        reportData.push([
          "Previous Period Sales",
          `$${salesOverview.previous.toFixed(2)}`,
        ]);
        reportData.push(["Change", `$${salesOverview.change.toFixed(2)}`]);
        reportData.push([
          "Change Percent",
          `${salesOverview.changePercent.toFixed(2)}%`,
        ]);
      } else {
        reportData.push(["No sales data available"]);
      }
      reportData.push([""]);

      // Revenue Breakdown
      reportData.push(["REVENUE BREAKDOWN"]);
      if (revenueBreakdown) {
        const total =
          revenueBreakdown.productSales +
          revenueBreakdown.shipping +
          revenueBreakdown.taxes +
          revenueBreakdown.other;
        reportData.push([
          "Product Sales",
          `$${revenueBreakdown.productSales.toFixed(2)}`,
          total > 0
            ? `${((revenueBreakdown.productSales / total) * 100).toFixed(1)}%`
            : "0%",
        ]);
        reportData.push([
          "Shipping",
          `$${revenueBreakdown.shipping.toFixed(2)}`,
          total > 0
            ? `${((revenueBreakdown.shipping / total) * 100).toFixed(1)}%`
            : "0%",
        ]);
        reportData.push([
          "Taxes",
          `$${revenueBreakdown.taxes.toFixed(2)}`,
          total > 0
            ? `${((revenueBreakdown.taxes / total) * 100).toFixed(1)}%`
            : "0%",
        ]);
        reportData.push([
          "Other",
          `$${revenueBreakdown.other.toFixed(2)}`,
          total > 0
            ? `${((revenueBreakdown.other / total) * 100).toFixed(1)}%`
            : "0%",
        ]);
      } else {
        reportData.push(["No revenue breakdown data available"]);
      }
      reportData.push([""]);

      // Performance Metrics
      reportData.push(["PERFORMANCE METRICS"]);
      if (performanceMetrics) {
        reportData.push([
          "Conversion Rate",
          `${performanceMetrics.conversionRate.toFixed(1)}%`,
        ]);
        reportData.push([
          "Average Order Value",
          `$${performanceMetrics.avgOrderValue.toFixed(2)}`,
        ]);
        reportData.push([
          "Items per Order",
          performanceMetrics.itemsPerOrder.toFixed(1),
        ]);
        reportData.push([
          "Customer Satisfaction",
          `${performanceMetrics.customerSatisfaction}%`,
        ]);
      } else {
        reportData.push(["No performance metrics available"]);
      }
      reportData.push([""]);

      // Sales Trend
      reportData.push(["SALES TREND"]);
      reportData.push(["Date", "Sales", "Orders"]);
      if (salesTrend && salesTrend.length > 0) {
        salesTrend.forEach((data) => {
          reportData.push([
            data.date,
            `$${data.sales.toFixed(2)}`,
            data.orders.toString(),
          ]);
        });
      } else {
        reportData.push(["No sales trend data available"]);
      }
      reportData.push([""]);

      // Top Products
      reportData.push(["TOP PRODUCTS"]);
      reportData.push(["Product Name", "Units Sold", "Sales Amount"]);
      if (topProducts && topProducts.length > 0) {
        topProducts.forEach((product) => {
          reportData.push([
            product.name,
            product.units.toString(),
            `$${product.sales.toFixed(2)}`,
          ]);
        });
      } else {
        reportData.push(["No top products data available"]);
      }
      reportData.push([""]);

      // Recent Transactions
      reportData.push(["RECENT TRANSACTIONS"]);
      reportData.push([
        "Transaction ID",
        "Customer",
        "Amount",
        "Status",
        "Date",
      ]);
      if (recentTransactions && recentTransactions.length > 0) {
        recentTransactions.forEach((transaction) => {
          reportData.push([
            transaction.id,
            transaction.customer,
            transaction.amount,
            transaction.status,
            transaction.date,
          ]);
        });
      } else {
        reportData.push(["No recent transactions data available"]);
      }

      // Convert to CSV
      const csvContent = reportData
        .map((row) =>
          row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `sales-analytics-report-${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting report:", error);
      alert("Failed to export report. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">Sales Analytics</h1>
          <p className="text-[#9E9E9E]">
            Track your sales performance and revenue
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            className="px-4 py-2 border border-[#9E9E9E]/30 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="1year">Last Year</option>
          </select>
          <button
            className="bg-[#002B5B] text-white px-4 py-2 rounded-lg hover:bg-[#001a3d] transition-colors flex items-center gap-2"
            onClick={exportReport}
          >
            <CalendarIcon className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Sales Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {salesData.map((item, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{item.period}</p>
                <p className="text-2xl font-bold text-gray-900">{item.sales}</p>
                <div className="flex items-center mt-2">
                  {item.isPositive ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span
                    className={`text-sm ${
                      item.isPositive ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {item.change}
                  </span>
                </div>
              </div>
              <div
                className={`p-3 rounded-full ${
                  item.isPositive ? "bg-green-100" : "bg-red-100"
                }`}
              >
                <span className="text-2xl">
                  {item.isPositive ? "📈" : "📉"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
            <div className="flex items-center gap-2">
              <select
                className="px-3 py-1 border border-gray-300 rounded text-sm"
                value={chartPeriod}
                onChange={(e) => setChartPeriod(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <button
                onClick={() => {
                  setModalType("sales");
                  setShowModal(true);
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                View Details
              </button>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            {salesTrend && salesTrend.length > 0 ? (
              <div className="w-full h-full p-4">
                <div className="flex flex-col h-full">
                  <div className="flex-1 flex items-end justify-between space-x-1">
                    {salesTrend.slice(-10).map((data, index) => {
                      const maxSales = Math.max(
                        ...salesTrend.map((d) => d.sales)
                      );
                      const height =
                        maxSales > 0 ? (data.sales / maxSales) * 100 : 0;
                      return (
                        <div
                          key={index}
                          className="flex flex-col items-center flex-1 group"
                        >
                          <div
                            className="bg-blue-500 rounded-t w-full min-h-[10px] transition-all duration-300 hover:bg-blue-600 cursor-pointer"
                            style={{ height: `${Math.max(height, 3)}%` }}
                          >
                            <div className="opacity-0 group-hover:opacity-100 bg-black text-white text-xs rounded px-2 py-1 absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-10">
                              ${data.sales.toFixed(2)} ({data.orders} orders)
                            </div>
                          </div>
                          <span className="text-xs text-gray-600 mt-2 text-center leading-tight">
                            {chartPeriod === "daily"
                              ? data.date.includes("-")
                                ? data.date.split("-").pop()
                                : data.date
                              : chartPeriod === "weekly"
                              ? data.date.includes("-W")
                                ? `W${data.date.split("-W")[1]}`
                                : data.date
                              : data.date.includes("-")
                              ? data.date.split("-")[1]
                              : data.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-center mt-4">
                    <p className="text-sm text-gray-600">
                      Sales Trend - Last {salesTrend.slice(-10).length}{" "}
                      {chartPeriod === "daily"
                        ? "days"
                        : chartPeriod === "weekly"
                        ? "weeks"
                        : "months"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-600">Loading sales trend...</p>
                <p className="text-sm text-gray-500">Chart will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Revenue Breakdown
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Product Sales</span>
              </div>
              <span className="text-sm font-medium">
                $
                {revenueBreakdown
                  ? revenueBreakdown.productSales.toFixed(2)
                  : "0.00"}{" "}
                (
                {revenueBreakdown &&
                revenueBreakdown.productSales +
                  revenueBreakdown.shipping +
                  revenueBreakdown.taxes +
                  revenueBreakdown.other >
                  0
                  ? Math.round(
                      (revenueBreakdown.productSales /
                        (revenueBreakdown.productSales +
                          revenueBreakdown.shipping +
                          revenueBreakdown.taxes +
                          revenueBreakdown.other)) *
                        100
                    )
                  : 0}
                %)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Shipping</span>
              </div>
              <span className="text-sm font-medium">
                $
                {revenueBreakdown
                  ? revenueBreakdown.shipping.toFixed(2)
                  : "0.00"}{" "}
                (
                {revenueBreakdown &&
                revenueBreakdown.productSales +
                  revenueBreakdown.shipping +
                  revenueBreakdown.taxes +
                  revenueBreakdown.other >
                  0
                  ? Math.round(
                      (revenueBreakdown.shipping /
                        (revenueBreakdown.productSales +
                          revenueBreakdown.shipping +
                          revenueBreakdown.taxes +
                          revenueBreakdown.other)) *
                        100
                    )
                  : 0}
                %)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Taxes</span>
              </div>
              <span className="text-sm font-medium">
                ${revenueBreakdown ? revenueBreakdown.taxes.toFixed(2) : "0.00"}{" "}
                (
                {revenueBreakdown &&
                revenueBreakdown.productSales +
                  revenueBreakdown.shipping +
                  revenueBreakdown.taxes +
                  revenueBreakdown.other >
                  0
                  ? Math.round(
                      (revenueBreakdown.taxes /
                        (revenueBreakdown.productSales +
                          revenueBreakdown.shipping +
                          revenueBreakdown.taxes +
                          revenueBreakdown.other)) *
                        100
                    )
                  : 0}
                %)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Other</span>
              </div>
              <span className="text-sm font-medium">
                ${revenueBreakdown ? revenueBreakdown.other.toFixed(2) : "0.00"}{" "}
                (
                {revenueBreakdown &&
                revenueBreakdown.productSales +
                  revenueBreakdown.shipping +
                  revenueBreakdown.taxes +
                  revenueBreakdown.other >
                  0
                  ? Math.round(
                      (revenueBreakdown.other /
                        (revenueBreakdown.productSales +
                          revenueBreakdown.shipping +
                          revenueBreakdown.taxes +
                          revenueBreakdown.other)) *
                        100
                    )
                  : 0}
                %)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Top Products
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setModalType("products");
                  setShowModal(true);
                }}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View All
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {topProducts &&
              topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.units} units sold
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ${product.sales.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Transactions
            </h3>
            <button
              onClick={() => {
                setModalType("transactions");
                setShowModal(true);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentTransactions &&
              recentTransactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.id}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.customer}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.amount}
                    </p>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        transaction.status
                      )}`}
                    >
                      {transaction.status}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Performance Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {performanceMetrics
                ? performanceMetrics.conversionRate.toFixed(1)
                : "0.0"}
              %
            </div>
            <div className="text-sm text-gray-600">Conversion Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              $
              {performanceMetrics
                ? performanceMetrics.avgOrderValue.toFixed(2)
                : "0.00"}
            </div>
            <div className="text-sm text-gray-600">Avg Order Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {performanceMetrics
                ? performanceMetrics.itemsPerOrder.toFixed(1)
                : "0.0"}
            </div>
            <div className="text-sm text-gray-600">Items per Order</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {performanceMetrics ? performanceMetrics.customerSatisfaction : 0}
              %
            </div>
            <div className="text-sm text-gray-600">Customer Satisfaction</div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalType === "sales" && "Sales Trend Details"}
                  {modalType === "products" && "Top Products Details"}
                  {modalType === "transactions" &&
                    "Recent Transactions Details"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {modalType === "sales" && salesTrend && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Sales Data</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full table-auto">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-2 text-left">Date</th>
                            <th className="px-4 py-2 text-left">Sales</th>
                            <th className="px-4 py-2 text-left">Orders</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salesTrend.map((data, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2">{data.date}</td>
                              <td className="px-4 py-2">
                                ${data.sales.toFixed(2)}
                              </td>
                              <td className="px-4 py-2">{data.orders}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {modalType === "products" && topProducts && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Top Products</h3>
                    <div className="space-y-4">
                      {topProducts.map((product, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-600">
                              {product.units} units sold
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              ${product.sales.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {modalType === "transactions" && recentTransactions && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Recent Transactions
                    </h3>
                    <div className="space-y-4">
                      {recentTransactions.map((transaction, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{transaction.id}</p>
                            <p className="text-sm text-gray-600">
                              {transaction.customer}
                            </p>
                            <p className="text-xs text-gray-500">
                              {transaction.date}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              {transaction.amount}
                            </p>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                transaction.status
                              )}`}
                            >
                              {transaction.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
