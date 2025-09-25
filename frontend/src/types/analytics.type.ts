export interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalVendors: number;
  totalCategories: number;
  recentOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  conversionRate: number;
  averageOrderValue: number;
  topSellingProducts: Array<{
    product: any;
    totalSold: number;
    revenue: number;
  }>;
  recentActivity: Array<{
    type: string;
    message: string;
    timestamp: string;
    user?: any;
  }>;
}

export interface SalesAnalytics {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  salesGrowth: number;
  ordersGrowth: number;
  dailySales: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
  monthlySales: Array<{
    month: string;
    sales: number;
    orders: number;
  }>;
  salesByCategory: Array<{
    category: string;
    sales: number;
    percentage: number;
  }>;
  salesByVendor: Array<{
    vendor: any;
    sales: number;
    orders: number;
  }>;
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userGrowth: number;
  usersByCountry: Array<{
    country: string;
    users: number;
    percentage: number;
  }>;
  usersByAge: Array<{
    ageGroup: string;
    users: number;
    percentage: number;
  }>;
  userActivity: Array<{
    date: string;
    activeUsers: number;
    newUsers: number;
  }>;
  topCustomers: Array<{
    user: any;
    totalOrders: number;
    totalSpent: number;
  }>;
}

export interface ProductAnalytics {
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  topSellingProducts: Array<{
    product: any;
    totalSold: number;
    revenue: number;
  }>;
  productsByCategory: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  productPerformance: Array<{
    product: any;
    views: number;
    sales: number;
    conversionRate: number;
  }>;
  inventoryValue: number;
}

export interface VendorAnalytics {
  totalVendors: number;
  activeVendors: number;
  pendingVendors: number;
  approvedVendors: number;
  rejectedVendors: number;
  topVendors: Array<{
    vendor: any;
    totalSales: number;
    totalOrders: number;
    rating: number;
  }>;
  vendorGrowth: Array<{
    date: string;
    newVendors: number;
    approvedVendors: number;
  }>;
  vendorPerformance: Array<{
    vendor: any;
    sales: number;
    orders: number;
    products: number;
    rating: number;
  }>;
}

export interface TimeRange {
  start: string;
  end: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
}
