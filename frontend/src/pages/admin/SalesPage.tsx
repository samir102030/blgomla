import React, { useState } from 'react';
import { CalendarIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

const SalesPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('7days');

  const salesData = [
    { period: 'Today', sales: '$2,847', change: '+12.5%', isPositive: true },
    { period: 'Yesterday', sales: '$2,534', change: '-3.2%', isPositive: false },
    { period: 'This Week', sales: '$18,945', change: '+8.7%', isPositive: true },
    { period: 'Last Week', sales: '$17,432', change: '+15.3%', isPositive: true },
    { period: 'This Month', sales: '$89,432', change: '+22.1%', isPositive: true },
    { period: 'Last Month', sales: '$73,245', change: '+18.9%', isPositive: true }
  ];

  const topProducts = [
    { name: 'Wireless Headphones', sales: '$12,847', units: 234, change: '+15%' },
    { name: 'Smart Watch', sales: '$9,432', units: 156, change: '+8%' },
    { name: 'Laptop Stand', sales: '$7,234', units: 89, change: '-2%' },
    { name: 'Coffee Mug', sales: '$5,678', units: 312, change: '+25%' },
    { name: 'Phone Case', sales: '$4,321', units: 178, change: '+12%' }
  ];

  const recentTransactions = [
    { id: '#ORD-001', customer: 'John Doe', amount: '$299.99', status: 'completed', date: '2024-01-21' },
    { id: '#ORD-002', customer: 'Jane Smith', amount: '$159.50', status: 'pending', date: '2024-01-21' },
    { id: '#ORD-003', customer: 'Mike Johnson', amount: '$89.99', status: 'completed', date: '2024-01-20' },
    { id: '#ORD-004', customer: 'Sarah Wilson', amount: '$449.99', status: 'completed', date: '2024-01-20' },
    { id: '#ORD-005', customer: 'David Brown', amount: '$199.99', status: 'refunded', date: '2024-01-19' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-[#009688]/10 text-[#009688]';
      case 'pending':
        return 'bg-[#FFD600]/10 text-[#333333]';
      case 'refunded':
        return 'bg-[#D32F2F]/10 text-[#D32F2F]';
      default:
        return 'bg-[#9E9E9E]/10 text-[#9E9E9E]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">Sales Analytics</h1>
          <p className="text-[#9E9E9E]">Track your sales performance and revenue</p>
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
          <button className="bg-[#002B5B] text-white px-4 py-2 rounded-lg hover:bg-[#001a3d] transition-colors flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Sales Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {salesData.slice(0, 3).map((item, index) => (
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
                  <span className={`text-sm ${item.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {item.change}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-full ${item.isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
                <span className="text-2xl">{item.isPositive ? '📈' : '📉'}</span>
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
            <select className="px-3 py-1 border border-gray-300 rounded text-sm">
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-600">Sales Chart Placeholder</p>
              <p className="text-sm text-gray-500">Chart.js or similar library would go here</p>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Breakdown</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Product Sales</span>
              </div>
              <span className="text-sm font-medium">$67,432 (75%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Shipping</span>
              </div>
              <span className="text-sm font-medium">$12,847 (15%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Taxes</span>
              </div>
              <span className="text-sm font-medium">$6,734 (8%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Other</span>
              </div>
              <span className="text-sm font-medium">$1,789 (2%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm">View All</button>
          </div>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.units} units sold</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{product.sales}</p>
                  <p className={`text-xs ${product.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {product.change}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm">View All</button>
          </div>
          <div className="space-y-4">
            {recentTransactions.map((transaction, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{transaction.id}</p>
                  <p className="text-xs text-gray-500">{transaction.customer}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{transaction.amount}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">2.4%</div>
            <div className="text-sm text-gray-600">Conversion Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">$127.50</div>
            <div className="text-sm text-gray-600">Avg Order Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">3.2</div>
            <div className="text-sm text-gray-600">Items per Order</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">89%</div>
            <div className="text-sm text-gray-600">Customer Satisfaction</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPage;
