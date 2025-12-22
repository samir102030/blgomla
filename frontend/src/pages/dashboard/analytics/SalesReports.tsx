import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const SalesReports: React.FC = () => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState('7days');
  const [reportType, setReportType] = useState('overview');

  const salesData = {
    totalRevenue: '$124,563.00',
    totalOrders: 2847,
    averageOrderValue: '$43.75',
    conversionRate: '3.2%',
    topProducts: [
      { name: 'iPhone 15 Pro', sales: '$45,230', units: 89, growth: '+12%' },
      { name: 'Samsung Galaxy S24', sales: '$38,150', units: 76, growth: '+8%' },
      { name: 'MacBook Air M3', sales: '$32,890', units: 23, growth: '+15%' },
      { name: 'Dell XPS 13', sales: '$28,450', units: 19, growth: '+5%' }
    ],
    topVendors: [
      { name: 'Tech Store Pro', revenue: '$45,230', orders: 234, commission: '$6,785' },
      { name: 'Fashion Hub', revenue: '$38,150', orders: 189, commission: '$4,578' },
      { name: 'Electronics Plus', revenue: '$32,890', orders: 156, commission: '$5,923' },
      { name: 'Home & Garden', revenue: '$28,450', orders: 134, commission: '$2,845' }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('sales.salesAnalytics')}</h1>
          <p className="text-gray-600">{t('sales.trackPerformance')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
            <option value="1year">Last year</option>
          </select>
          <button className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
            📊 {t('sales.exportReport')}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('admin.totalRevenue')}</p>
              <p className="text-2xl font-bold text-gray-900">{salesData.totalRevenue}</p>
              <div className="flex items-center mt-2">
                <span className="text-sm font-medium text-green-600">↗ +12.5%</span>
                <span className="text-sm text-gray-500 ml-1">vs last period</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white text-xl">
              💰
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('admin.totalOrders')}</p>
              <p className="text-2xl font-bold text-gray-900">{salesData.totalOrders.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <span className="text-sm font-medium text-green-600">↗ +8.3%</span>
                <span className="text-sm text-gray-500 ml-1">vs last period</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl">
              🛒
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('sales.avgOrderValue')}</p>
              <p className="text-2xl font-bold text-gray-900">{salesData.averageOrderValue}</p>
              <div className="flex items-center mt-2">
                <span className="text-sm font-medium text-green-600">↗ +3.8%</span>
                <span className="text-sm text-gray-500 ml-1">vs last period</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center text-white text-xl">
              📈
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('sales.conversionRate')}</p>
              <p className="text-2xl font-bold text-gray-900">{salesData.conversionRate}</p>
              <div className="flex items-center mt-2">
                <span className="text-sm font-medium text-green-600">↗ +0.4%</span>
                <span className="text-sm text-gray-500 ml-1">vs last period</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xl">
              🎯
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
            <select className="text-sm border border-gray-300 rounded-md px-3 py-1">
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-500">Revenue Chart</p>
              <p className="text-sm text-gray-400">Line chart showing revenue over time</p>
            </div>
          </div>
        </div>

        {/* Orders Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Order Volume</h3>
            <select className="text-sm border border-gray-300 rounded-md px-3 py-1">
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">📈</div>
              <p className="text-gray-500">Orders Chart</p>
              <p className="text-sm text-gray-400">Bar chart showing order volume</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products and Vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('sales.topProducts')}</h3>
            <button className="text-sm text-yellow-600 hover:text-yellow-500">{t('sales.viewAll')}</button>
          </div>
          <div className="space-y-4">
            {salesData.topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.units} units sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{product.sales}</p>
                  <p className="text-sm text-green-600">{product.growth}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Vendors */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('admin.topPerformingStores')}</h3>
            <button className="text-sm text-yellow-600 hover:text-yellow-500">{t('sales.viewAll')}</button>
          </div>
          <div className="space-y-4">
            {salesData.topVendors.map((vendor, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                    {vendor.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{vendor.name}</p>
                    <p className="text-sm text-gray-500">{vendor.orders} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{vendor.revenue}</p>
                  <p className="text-sm text-gray-600">Commission: {vendor.commission}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Reports Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Sales Report</h3>
            <div className="flex items-center space-x-3">
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="overview">Overview</option>
                <option value="products">By Products</option>
                <option value="vendors">By Vendors</option>
                <option value="categories">By Categories</option>
              </select>
              <button className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm">
                📥 Download CSV
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-500 mb-2">Detailed Report Table</p>
            <p className="text-sm text-gray-400">Interactive table with sorting, filtering, and export capabilities</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesReports;
