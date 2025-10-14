import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../lib/axios";
import type {
  DashboardStats,
  SalesAnalytics,
  UserAnalytics,
  ProductAnalytics,
  VendorAnalytics,
  TimeRange,
} from "../types/analytics.type";

interface AnalyticsStore {
  // State
  dashboardStats: DashboardStats | undefined;
  salesAnalytics: SalesAnalytics | undefined;
  userAnalytics: UserAnalytics | undefined;
  productAnalytics: ProductAnalytics | undefined;
  vendorAnalytics: VendorAnalytics | undefined;
  salesOverview:
    | {
        current: number;
        previous: number;
        change: number;
        changePercent: number;
      }
    | undefined;
  topProducts:
    | Array<{ name: string; sales: number; units: number }>
    | undefined;
  recentTransactions:
    | Array<{
        id: string;
        customer: string;
        amount: string;
        status: string;
        date: string;
      }>
    | undefined;
  performanceMetrics:
    | {
        conversionRate: number;
        avgOrderValue: number;
        itemsPerOrder: number;
        customerSatisfaction: number;
      }
    | undefined;
  revenueBreakdown:
    | {
        productSales: number;
        shipping: number;
        taxes: number;
        other: number;
      }
    | undefined;
  salesTrend:
    | Array<{ date: string; sales: number; orders: number }>
    | undefined;
  loading: boolean;
  error: string | undefined;

  // Dashboard Analytics
  fetchDashboardStats: (timeRange?: TimeRange) => Promise<void>;

  // Sales Analytics
  fetchSalesAnalytics: (timeRange?: TimeRange) => Promise<void>;
  fetchSalesByPeriod: (
    period: "day" | "week" | "month" | "year",
    timeRange?: TimeRange
  ) => Promise<void>;
  fetchSalesByCategory: (timeRange?: TimeRange) => Promise<void>;
  fetchSalesByVendor: (timeRange?: TimeRange) => Promise<void>;

  // Sales Page specific
  fetchSalesOverview: (period?: string) => Promise<void>;
  fetchTopProducts: (limit?: number) => Promise<void>;
  fetchRecentTransactions: (limit?: number) => Promise<void>;
  fetchPerformanceMetrics: () => Promise<void>;
  fetchRevenueBreakdown: (period?: string) => Promise<void>;
  fetchSalesTrend: (period?: string, dateRange?: string) => Promise<void>;

  // User Analytics
  fetchUserAnalytics: (timeRange?: TimeRange) => Promise<void>;
  fetchUserGrowth: (timeRange?: TimeRange) => Promise<void>;
  fetchUserDemographics: () => Promise<void>;
  fetchTopCustomers: (limit?: number) => Promise<void>;

  // Product Analytics
  fetchProductAnalytics: (timeRange?: TimeRange) => Promise<void>;
  fetchTopSellingProducts: (
    limit?: number,
    timeRange?: TimeRange
  ) => Promise<void>;
  fetchProductPerformance: (timeRange?: TimeRange) => Promise<void>;
  fetchInventoryAnalytics: () => Promise<void>;

  // Vendor Analytics
  fetchVendorAnalytics: (timeRange?: TimeRange) => Promise<void>;
  fetchVendorPerformance: (timeRange?: TimeRange) => Promise<void>;
  fetchVendorGrowth: (timeRange?: TimeRange) => Promise<void>;

  // Export Functions
  exportAnalyticsReport: (
    type: "sales" | "users" | "products" | "vendors",
    format: "csv" | "pdf",
    timeRange?: TimeRange
  ) => Promise<string | undefined>;

  // Utility
  clearError: () => void;
  reset: () => void;
}

export const useAnalyticsStore = create<AnalyticsStore>()(
  persist(
    (set) => ({
      // Initial State
      dashboardStats: undefined,
      salesAnalytics: undefined,
      userAnalytics: undefined,
      productAnalytics: undefined,
      vendorAnalytics: undefined,
      salesOverview: undefined,
      topProducts: undefined,
      recentTransactions: undefined,
      performanceMetrics: undefined,
      revenueBreakdown: undefined,
      salesTrend: undefined,
      loading: false,
      error: undefined,

      // Fetch Dashboard Stats
      fetchDashboardStats: async (timeRange?: TimeRange) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            stats: DashboardStats;
          }>("/analytics/dashboard", {
            params: timeRange,
          });
          set({ dashboardStats: data.stats, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Sales Analytics
      fetchSalesAnalytics: async (timeRange?: TimeRange) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            analytics: SalesAnalytics;
          }>("/analytics/sales", {
            params: timeRange,
          });
          set({ salesAnalytics: data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Sales by Period
      fetchSalesByPeriod: async (
        period: "day" | "week" | "month" | "year",
        timeRange?: TimeRange
      ) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            analytics: SalesAnalytics;
          }>(`/analytics/sales/${period}`, {
            params: timeRange,
          });
          set({ salesAnalytics: data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Sales by Category
      fetchSalesByCategory: async (timeRange?: TimeRange) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            analytics: SalesAnalytics;
          }>("/analytics/sales/category", {
            params: timeRange,
          });
          set({ salesAnalytics: data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Sales by Vendor
      fetchSalesByVendor: async (timeRange?: TimeRange) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            analytics: SalesAnalytics;
          }>("/analytics/sales/vendor", {
            params: timeRange,
          });
          set({ salesAnalytics: data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Sales Page specific functions
      fetchSalesOverview: async (period = "7days") => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            data: {
              current: number;
              previous: number;
              change: number;
              changePercent: number;
            };
          }>("/analytics/sales-overview", {
            params: { period },
          });
          set({ salesOverview: data.data, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      fetchTopProducts: async (limit = 5) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            products: Array<{ name: string; sales: number; units: number }>;
          }>("/analytics/top-products", {
            params: { limit },
          });
          set({ topProducts: data.products, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      fetchRecentTransactions: async (limit = 5) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            transactions: Array<{
              id: string;
              customer: string;
              amount: string;
              status: string;
              date: string;
            }>;
          }>("/analytics/recent-transactions", {
            params: { limit },
          });
          set({ recentTransactions: data.transactions, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      fetchPerformanceMetrics: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            metrics: {
              conversionRate: number;
              avgOrderValue: number;
              itemsPerOrder: number;
              customerSatisfaction: number;
            };
          }>("/analytics/performance-metrics");
          set({ performanceMetrics: data.metrics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      fetchRevenueBreakdown: async (period = "7days") => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            breakdown: {
              productSales: number;
              shipping: number;
              taxes: number;
              other: number;
            };
          }>("/analytics/revenue-breakdown", {
            params: { period },
          });
          set({ revenueBreakdown: data.breakdown, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      fetchSalesTrend: async (period = "daily", dateRange = "7days") => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            trend: Array<{ date: string; sales: number; orders: number }>;
          }>("/analytics/sales-trend", {
            params: { period, dateRange },
          });
          set({ salesTrend: data.trend, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch User Analytics
      fetchUserAnalytics: async (timeRange?: TimeRange) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            analytics: UserAnalytics;
          }>("/analytics/users", {
            params: timeRange,
          });
          set({ userAnalytics: data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch User Growth
      fetchUserGrowth: async (timeRange?: TimeRange) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            analytics: UserAnalytics;
          }>("/analytics/users/growth", {
            params: timeRange,
          });
          set({ userAnalytics: data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch User Demographics
      fetchUserDemographics: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            analytics: UserAnalytics;
          }>("/analytics/users/demographics");
          set({ userAnalytics: data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Top Customers
      fetchTopCustomers: async (limit = 10) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            analytics: UserAnalytics;
          }>("/analytics/users/top-customers", {
            params: { limit },
          });
          set({ userAnalytics: data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Product Analytics
      fetchProductAnalytics: async (timeRange?: TimeRange) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            analytics: ProductAnalytics;
          }>("/analytics/products", {
            params: timeRange,
          });
          set({ productAnalytics: data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Top Selling Products
      fetchTopSellingProducts: async (limit = 10, timeRange?: TimeRange) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            analytics: ProductAnalytics;
          }>("/analytics/products/top-selling", {
            params: { limit, ...timeRange },
          });
          set({ productAnalytics: data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Product Performance
      fetchProductPerformance: async (timeRange?: TimeRange) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            analytics: ProductAnalytics;
          }>("/analytics/products/performance", {
            params: timeRange,
          });
          set({ productAnalytics: data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Inventory Analytics
      fetchInventoryAnalytics: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            analytics: ProductAnalytics;
          }>("/analytics/products/inventory");
          set({ productAnalytics: data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Vendor Analytics
      fetchVendorAnalytics: async (timeRange?: TimeRange) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            analytics: VendorAnalytics;
          }>("/analytics/vendors", {
            params: timeRange,
          });
          set({ vendorAnalytics: data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Vendor Performance
      fetchVendorPerformance: async (timeRange?: TimeRange) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            analytics: VendorAnalytics;
          }>("/analytics/vendors/performance", {
            params: timeRange,
          });
          set({ vendorAnalytics: data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Vendor Growth
      fetchVendorGrowth: async (timeRange?: TimeRange) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            analytics: VendorAnalytics;
          }>("/analytics/vendors/growth", {
            params: timeRange,
          });
          set({ vendorAnalytics: data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Export Analytics Report
      exportAnalyticsReport: async (
        type: "sales" | "users" | "products" | "vendors",
        format: "csv" | "pdf",
        timeRange?: TimeRange
      ) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.post<{
            success: boolean;
            downloadUrl: string;
          }>("/analytics/export", {
            type,
            format,
            timeRange,
          });
          set({ loading: false });
          return data.downloadUrl;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return undefined;
        }
      },

      // Clear Error
      clearError: () => set({ error: undefined }),

      // Reset Store
      reset: () =>
        set({
          dashboardStats: undefined,
          salesAnalytics: undefined,
          userAnalytics: undefined,
          productAnalytics: undefined,
          vendorAnalytics: undefined,
          salesOverview: undefined,
          topProducts: undefined,
          recentTransactions: undefined,
          performanceMetrics: undefined,
          revenueBreakdown: undefined,
          salesTrend: undefined,
          loading: false,
          error: undefined,
        }),
    }),
    {
      name: "analytics-store",
      partialize: () => ({}), // Don't persist analytics data
    }
  )
);
