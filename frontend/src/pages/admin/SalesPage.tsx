import React, { useState, useEffect } from "react";
import {
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import { useAnalyticsStore } from "../../stores/analytics.store";
import { useTranslation } from "react-i18next";
import { useMoney } from "../../lib/money";

const SalesPage: React.FC = () => {
  const { t } = useTranslation();
  const money = useMoney();
  const [dateRange, setDateRange] = useState("7days");
  const [chartPeriod, setChartPeriod] = useState("daily");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<
    "sales" | "products" | "transactions" | "revenue" | "metrics"
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
      period: t("sales.currentPeriod"),
      sales: money(salesOverview?.current),
      change: salesOverview
        ? `${salesOverview.changePercent.toFixed(1)}%`
        : "0.0%",
      isPositive: salesOverview ? salesOverview.changePercent >= 0 : true,
    },
    {
      period: t("sales.previousPeriod"),
      sales: money(salesOverview?.previous),
      change: salesOverview
        ? `${salesOverview.changePercent.toFixed(1)}%`
        : "0.0%",
      isPositive: salesOverview ? salesOverview.changePercent >= 0 : true,
    },
    {
      period: t("sales.change"),
      sales: money(salesOverview?.change),
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

  const exportModalData = (type: string) => {
    try {
      let reportData: string[][] = [];
      let filename = "";

      if (type === "sales" && salesTrend) {
        reportData.push([t("sales.salesTrendDetails")]);
        reportData.push([
          t("sales.tableDate"),
          t("sales.tableSales"),
          t("sales.tableOrders"),
        ]);
        salesTrend.forEach((data) => {
          reportData.push([
            data.date,
            money(data.sales),
            data.orders.toString(),
          ]);
        });
        filename = `sales-trend-${new Date().toISOString().split("T")[0]}.csv`;
      } else if (type === "products" && topProducts) {
        reportData.push([t("sales.topProductsDetails")]);
        reportData.push([
          t("sales.productName"),
          t("sales.unitsColumn"),
          t("sales.salesAmount"),
        ]);
        topProducts.forEach((product) => {
          reportData.push([
            product.name,
            product.units.toString(),
            money(product.sales),
          ]);
        });
        filename = `top-products-${new Date().toISOString().split("T")[0]}.csv`;
      } else if (type === "transactions" && recentTransactions) {
        reportData.push([t("sales.recentTransactionsDetails")]);
        reportData.push([
          t("sales.transactionId"),
          t("sales.transactionCustomer"),
          t("sales.transactionAmount"),
          t("sales.transactionStatus"),
          t("sales.transactionDate"),
        ]);
        recentTransactions.forEach((transaction) => {
          reportData.push([
            transaction.id,
            transaction.customer,
            transaction.amount,
            transaction.status,
            transaction.date,
          ]);
        });
        filename = `recent-transactions-${
          new Date().toISOString().split("T")[0]
        }.csv`;
      } else if (type === "revenue" && revenueBreakdown) {
        reportData.push([t("sales.revenueBreakdownDetails")]);
        reportData.push([
          t("sales.category"),
          t("sales.transactionAmount"),
          t("sales.percentage"),
        ]);
        const total =
          revenueBreakdown.productSales +
          revenueBreakdown.shipping +
          revenueBreakdown.taxes +
          revenueBreakdown.other;
        reportData.push([
          t("sales.productSales"),
          money(revenueBreakdown.productSales),
          total > 0
            ? `${((revenueBreakdown.productSales / total) * 100).toFixed(1)}%`
            : "0%",
        ]);
        reportData.push([
          t("sales.shipping"),
          money(revenueBreakdown.shipping),
          total > 0
            ? `${((revenueBreakdown.shipping / total) * 100).toFixed(1)}%`
            : "0%",
        ]);
        reportData.push([
          t("sales.taxes"),
          money(revenueBreakdown.taxes),
          total > 0
            ? `${((revenueBreakdown.taxes / total) * 100).toFixed(1)}%`
            : "0%",
        ]);
        reportData.push([
          t("sales.other"),
          money(revenueBreakdown.other),
          total > 0
            ? `${((revenueBreakdown.other / total) * 100).toFixed(1)}%`
            : "0%",
        ]);
        filename = `revenue-breakdown-${
          new Date().toISOString().split("T")[0]
        }.csv`;
      } else if (type === "metrics" && performanceMetrics) {
        reportData.push([t("sales.performanceMetricsDetails")]);
        reportData.push([
          t("sales.metric"),
          t("sales.value"),
          t("sales.description"),
        ]);
        reportData.push([
          t("sales.conversionRate"),
          `${performanceMetrics.conversionRate.toFixed(1)}%`,
          t("sales.conversionRateDesc"),
        ]);
        reportData.push([
          t("sales.avgOrderValue"),
          money(performanceMetrics.avgOrderValue),
          t("sales.avgOrderValueDesc"),
        ]);
        reportData.push([
          t("sales.itemsPerOrder"),
          performanceMetrics.itemsPerOrder.toFixed(1),
          t("sales.itemsPerOrderDesc"),
        ]);
        reportData.push([
          t("sales.customerSatisfaction"),
          `${performanceMetrics.customerSatisfaction}%`,
          t("sales.customerSatisfactionDesc"),
        ]);
        filename = `performance-metrics-${
          new Date().toISOString().split("T")[0]
        }.csv`;
      } else {
        alert(t("sales.noDataToExport"));
        return;
      }

      const csvContent = reportData
        .map((row) =>
          row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting modal data:", error);
      alert(t("sales.exportFailed"));
    }
  };

  const exportReport = () => {
    try {
      const reportData = [];

      // Add header
      reportData.push([t("sales.salesAnalyticsReport")]);
      reportData.push([t("sales.generatedOn"), new Date().toLocaleString()]);
      reportData.push([t("sales.dateRange"), dateRange]);
      reportData.push([t("sales.chartPeriod"), chartPeriod]);
      reportData.push([""]);

      // Sales Overview
      reportData.push([t("sales.salesOverview")]);
      if (salesOverview) {
        reportData.push([
          t("sales.currentPeriod"),
          money(salesOverview.current),
        ]);
        reportData.push([
          t("sales.previousPeriod"),
          money(salesOverview.previous),
        ]);
        reportData.push([t("sales.change"), money(salesOverview.change)]);
        reportData.push([
          t("sales.changePercent"),
          `${salesOverview.changePercent.toFixed(2)}%`,
        ]);
      } else {
        reportData.push([t("sales.noSalesData")]);
      }
      reportData.push([""]);

      // Revenue Breakdown
      reportData.push([t("sales.revenueBreakdown")]);
      if (revenueBreakdown) {
        const total =
          revenueBreakdown.productSales +
          revenueBreakdown.shipping +
          revenueBreakdown.taxes +
          revenueBreakdown.other;
        reportData.push([
          t("sales.productSales"),
          money(revenueBreakdown.productSales),
          total > 0
            ? `${((revenueBreakdown.productSales / total) * 100).toFixed(1)}%`
            : "0%",
        ]);
        reportData.push([
          t("sales.shipping"),
          money(revenueBreakdown.shipping),
          total > 0
            ? `${((revenueBreakdown.shipping / total) * 100).toFixed(1)}%`
            : "0%",
        ]);
        reportData.push([
          t("sales.taxes"),
          money(revenueBreakdown.taxes),
          total > 0
            ? `${((revenueBreakdown.taxes / total) * 100).toFixed(1)}%`
            : "0%",
        ]);
        reportData.push([
          t("sales.other"),
          money(revenueBreakdown.other),
          total > 0
            ? `${((revenueBreakdown.other / total) * 100).toFixed(1)}%`
            : "0%",
        ]);
      } else {
        reportData.push([t("sales.noRevenueData")]);
      }
      reportData.push([""]);

      // Performance Metrics
      reportData.push([t("sales.performanceMetrics")]);
      if (performanceMetrics) {
        reportData.push([
          t("sales.conversionRate"),
          `${performanceMetrics.conversionRate.toFixed(1)}%`,
        ]);
        reportData.push([
          t("sales.avgOrderValue"),
          money(performanceMetrics.avgOrderValue),
        ]);
        reportData.push([
          t("sales.itemsPerOrder"),
          performanceMetrics.itemsPerOrder.toFixed(1),
        ]);
        reportData.push([
          t("sales.customerSatisfaction"),
          `${performanceMetrics.customerSatisfaction}%`,
        ]);
      } else {
        reportData.push([t("sales.noMetricsData")]);
      }
      reportData.push([""]);

      // Sales Trend
      reportData.push([t("sales.salesTrend")]);
      reportData.push([
        t("sales.tableDate"),
        t("sales.tableSales"),
        t("sales.tableOrders"),
      ]);
      if (salesTrend && salesTrend.length > 0) {
        salesTrend.forEach((data) => {
          reportData.push([
            data.date,
            money(data.sales),
            data.orders.toString(),
          ]);
        });
      } else {
        reportData.push([t("sales.noTrendData")]);
      }
      reportData.push([""]);

      // Top Products
      reportData.push([t("sales.topProducts")]);
      reportData.push([
        t("sales.productName"),
        t("sales.unitsColumn"),
        t("sales.salesAmount"),
      ]);
      if (topProducts && topProducts.length > 0) {
        topProducts.forEach((product) => {
          reportData.push([
            product.name,
            product.units.toString(),
            money(product.sales),
          ]);
        });
      } else {
        reportData.push([t("sales.noProductsData")]);
      }
      reportData.push([""]);

      // Recent Transactions
      reportData.push([t("sales.recentTransactions")]);
      reportData.push([
        t("sales.transactionId"),
        t("sales.transactionCustomer"),
        t("sales.transactionAmount"),
        t("sales.transactionStatus"),
        t("sales.transactionDate"),
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
        reportData.push([t("sales.noTransactionsData")]);
      }

      // Convert to CSV
      const csvContent = reportData
        .map((row) =>
          row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");

      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `sales-analytics-report-${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting report:", error);
      alert(t("sales.exportFailed"));
    }
  };

  if (loading && !salesOverview) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">{t("sales.loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#333333]">
            {t("sales.salesAnalytics")}
          </h1>
          <p className="text-[#9E9E9E]">{t("sales.trackPerformance")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <select
            className="px-4 py-2 border border-[#9E9E9E]/30 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7days">{t("sales.last7Days")}</option>
            <option value="30days">{t("sales.last30Days")}</option>
            <option value="90days">{t("sales.last90Days")}</option>
            <option value="1year">{t("sales.lastYear")}</option>
          </select>
          <button
            className="bg-[#002B5B] text-white px-4 py-2 rounded-lg hover:bg-[#001a3d] transition-colors flex items-center gap-2"
            onClick={exportReport}
          >
            <CalendarIcon className="h-4 w-4" />
            {t("sales.exportReport")}
          </button>
        </div>
      </div>

      {/* Sales Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {salesData.map((item, index) => (
          <div key={index} className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{item.period}</p>
                <p className="text-2xl font-bold text-gray-900">{item.sales}</p>
                <div className="flex items-center gap-1 mt-2">
                  {item.isPositive ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500" />
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
 {item.isPositive ? "" : ""}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Sales Chart */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {t("sales.salesTrend")}
            </h3>
            <div className="flex items-center gap-2">
              <select
                className="px-3 py-1 border border-gray-300 rounded text-sm"
                value={chartPeriod}
                onChange={(e) => setChartPeriod(e.target.value)}
              >
                <option value="daily">{t("sales.daily")}</option>
                <option value="weekly">{t("sales.weekly")}</option>
                <option value="monthly">{t("sales.monthly")}</option>
              </select>
              <button
                onClick={() => {
                  setModalType("sales");
                  setShowModal(true);
                }}
                className="px-3 py-1 bg-[var(--brand-primary)] text-white rounded text-sm hover:bg-[var(--brand-accent)]"
              >
                {t("sales.viewAll")}
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
                        ...salesTrend.map((d) => d.sales),
                      );
                      const height =
                        maxSales > 0 ? (data.sales / maxSales) * 100 : 0;
                      return (
                        <div
                          key={index}
                          className="flex flex-col items-center flex-1 group"
                        >
                          <div
                            className="bg-[var(--brand-primary)] rounded-t w-full min-h-[10px] transition-all duration-300 hover:bg-[var(--brand-accent)] cursor-pointer"
                            style={{ height: `${Math.max(height, 3)}%` }}
                          >
                            <div className="opacity-0 group-hover:opacity-100 bg-black text-white text-xs rounded px-2 py-1 absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-10">
                              {money(data.sales)} (
                              {t("sales.ordersCount", { n: data.orders })})
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
                      {t("sales.salesTrendLast", {
                        n: salesTrend.slice(-10).length,
                        unit:
                          chartPeriod === "daily"
                            ? t("sales.days")
                            : chartPeriod === "weekly"
                              ? t("sales.weeks")
                              : t("sales.months"),
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
 <div className="text-4xl mb-2"></div>
                <p className="text-gray-600">{t("sales.loadingTrend")}</p>
                <p className="text-sm text-gray-500">
                  {t("sales.chartPlaceholder")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {t("sales.revenueBreakdown")}
            </h3>
            <button
              onClick={() => {
                setModalType("revenue");
                setShowModal(true);
              }}
              className="px-3 py-1 bg-[var(--brand-primary)] text-white rounded text-sm hover:bg-[var(--brand-accent)]"
            >
              {t("sales.viewDetails")}
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[var(--brand-primary)] rounded-full"></div>
                <span className="text-sm text-gray-700">
                  {t("sales.productSales")}
                </span>
              </div>
              <span className="text-sm font-medium">
                {money(revenueBreakdown?.productSales)} (
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
                        100,
                    )
                  : 0}
                %)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  {t("sales.shipping")}
                </span>
              </div>
              <span className="text-sm font-medium">
                {money(revenueBreakdown?.shipping)} (
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
                        100,
                    )
                  : 0}
                %)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  {t("sales.taxes")}
                </span>
              </div>
              <span className="text-sm font-medium">
                {money(revenueBreakdown?.taxes)} (
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
                        100,
                    )
                  : 0}
                %)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[var(--brand-primary)] rounded-full"></div>
                <span className="text-sm text-gray-700">
                  {t("sales.other")}
                </span>
              </div>
              <span className="text-sm font-medium">
                {money(revenueBreakdown?.other)} (
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
                        100,
                    )
                  : 0}
                %)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Top Products */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {t("sales.topProducts")}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setModalType("products");
                  setShowModal(true);
                }}
                className="text-[var(--brand-primary)] hover:text-[var(--brand-accent)] text-sm"
              >
                {t("sales.viewAll")}
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
                      {product.units} {t("sales.unitsSold")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {money(product.sales)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {t("sales.recentTransactions")}
            </h3>
            <button
              onClick={() => {
                setModalType("transactions");
                setShowModal(true);
              }}
              className="text-[var(--brand-primary)] hover:text-[var(--brand-accent)] text-sm"
            >
              {t("sales.viewAll")}
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
                        transaction.status,
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
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {t("sales.performanceMetrics")}
          </h3>
          <button
            onClick={() => {
              setModalType("metrics");
              setShowModal(true);
            }}
            className="px-3 py-1 bg-[var(--brand-primary)] text-white rounded text-sm hover:bg-[var(--brand-accent)]"
          >
            {t("sales.viewAll")}
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--brand-primary)]">
              {performanceMetrics
                ? performanceMetrics.conversionRate.toFixed(1)
                : "0.0"}
              %
            </div>
            <div className="text-sm text-gray-600">
              {t("sales.conversionRate")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {money(performanceMetrics?.avgOrderValue)}
            </div>
            <div className="text-sm text-gray-600">
              {t("sales.avgOrderValue")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--brand-primary)]">
              {performanceMetrics
                ? performanceMetrics.itemsPerOrder.toFixed(1)
                : "0.0"}
            </div>
            <div className="text-sm text-gray-600">
              {t("sales.itemsPerOrder")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {performanceMetrics ? performanceMetrics.customerSatisfaction : 0}
              %
            </div>
            <div className="text-sm text-gray-600">
              {t("sales.customerSatisfaction")}
            </div>
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
            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {modalType === "sales" && t("sales.salesTrendDetails")}
                  {modalType === "products" && t("sales.topProductsDetails")}
                  {modalType === "transactions" &&
                    t("sales.recentTransactionsDetails")}
                  {modalType === "revenue" &&
                    t("sales.revenueBreakdownDetails")}
                  {modalType === "metrics" &&
                    t("sales.performanceMetricsDetails")}
                </h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => exportModalData(modalType)}
                    className="bg-[#002B5B] text-white px-4 py-2 rounded-lg hover:bg-[#001a3d] transition-colors text-sm"
                  >
                    {t("sales.exportData")}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {modalType === "sales" && salesTrend && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      {t("sales.salesData")}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full table-auto">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-2 text-start">
                              {t("sales.tableDate")}
                            </th>
                            <th className="px-4 py-2 text-start">
                              {t("sales.tableSales")}
                            </th>
                            <th className="px-4 py-2 text-start">
                              {t("sales.tableOrders")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {salesTrend.map((data, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2">{data.date}</td>
                              <td className="px-4 py-2">
                                {money(data.sales)}
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
                    <h3 className="text-lg font-semibold mb-4">
                      {t("sales.topProducts")}
                    </h3>
                    <div className="space-y-4">
                      {topProducts.map((product, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-600">
                              {product.units} {t("sales.unitsSold")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              {money(product.sales)}
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
                      {t("sales.recentTransactions")}
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
                                transaction.status,
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

                {modalType === "revenue" && revenueBreakdown && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      {t("sales.revenueBreakdown")}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full table-auto">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-2 text-start">
                              {t("sales.category")}
                            </th>
                            <th className="px-4 py-2 text-start">
                              {t("sales.transactionAmount")}
                            </th>
                            <th className="px-4 py-2 text-start">
                              {t("sales.percentage")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t">
                            <td className="px-4 py-2">
                              {t("sales.productSales")}
                            </td>
                            <td className="px-4 py-2">
                              {money(revenueBreakdown.productSales)}
                            </td>
                            <td className="px-4 py-2">
                              {revenueBreakdown.productSales +
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
                                      100,
                                  )
                                : 0}
                              %
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="px-4 py-2">{t("sales.shipping")}</td>
                            <td className="px-4 py-2">
                              {money(revenueBreakdown.shipping)}
                            </td>
                            <td className="px-4 py-2">
                              {revenueBreakdown.productSales +
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
                                      100,
                                  )
                                : 0}
                              %
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="px-4 py-2">{t("sales.taxes")}</td>
                            <td className="px-4 py-2">
                              {money(revenueBreakdown.taxes)}
                            </td>
                            <td className="px-4 py-2">
                              {revenueBreakdown.productSales +
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
                                      100,
                                  )
                                : 0}
                              %
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="px-4 py-2">{t("sales.other")}</td>
                            <td className="px-4 py-2">
                              {money(revenueBreakdown.other)}
                            </td>
                            <td className="px-4 py-2">
                              {revenueBreakdown.productSales +
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
                                      100,
                                  )
                                : 0}
                              %
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {modalType === "metrics" && performanceMetrics && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      {t("sales.performanceMetrics")}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">
                          {t("sales.conversionRate")}
                        </h4>
                        <p className="text-2xl font-bold text-[var(--brand-primary)]">
                          {performanceMetrics.conversionRate.toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-600">
                          {t("sales.conversionRateDesc")}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">
                          {t("sales.avgOrderValue")}
                        </h4>
                        <p className="text-2xl font-bold text-green-600">
                          {money(performanceMetrics.avgOrderValue)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {t("sales.avgOrderValueDesc")}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">
                          {t("sales.itemsPerOrder")}
                        </h4>
                        <p className="text-2xl font-bold text-[var(--brand-primary)]">
                          {performanceMetrics.itemsPerOrder.toFixed(1)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {t("sales.itemsPerOrderDesc")}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">
                          {t("sales.customerSatisfaction")}
                        </h4>
                        <p className="text-2xl font-bold text-orange-600">
                          {performanceMetrics.customerSatisfaction}%
                        </p>
                        <p className="text-sm text-gray-600">
                          {t("sales.customerSatisfactionDesc")}
                        </p>
                      </div>
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
