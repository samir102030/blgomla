import React from 'react';
import { useTranslation } from 'react-i18next';

const DashboardOverview: React.FC = () => {
  const { t } = useTranslation();
  const stats = [
    {
      title: t('admin.totalRevenue'),
      value: '$124,563',
      change: '+12.5%',
      changeType: 'increase',
      icon: '💰',
      color: 'bg-green-500'
    },
    {
      title: t('vendor.activeProducts'),
      value: '156',
      change: '+8',
      changeType: 'increase',
      icon: '🏪',
      color: 'bg-blue-500'
    },
    {
      title: t('admin.totalOrders'),
      value: '2,847',
      change: '+23.1%',
      changeType: 'increase',
      icon: '🛒',
      color: 'bg-yellow-500'
    },
    {
      title: t('sales.customerSatisfaction'),
      value: '4.8/5',
      change: '+0.2',
      changeType: 'increase',
      icon: '⭐',
      color: 'bg-purple-500'
    }
  ];

  const recentOrders = [
    { id: '#12345', customer: 'John Doe', vendor: 'Tech Store', amount: '$299.99', status: 'Processing', time: '2 min ago' },
    { id: '#12346', customer: 'Jane Smith', vendor: 'Fashion Hub', amount: '$159.50', status: 'Shipped', time: '5 min ago' },
    { id: '#12347', customer: 'Mike Johnson', vendor: 'Electronics Plus', amount: '$89.99', status: 'Delivered', time: '10 min ago' },
    { id: '#12348', customer: 'Sarah Wilson', vendor: 'Home & Garden', amount: '$199.99', status: 'Pending', time: '15 min ago' }
  ];

  const topVendors = [
    { name: 'Tech Store', revenue: '$45,230', orders: 234, rating: 4.9 },
    { name: 'Fashion Hub', revenue: '$38,150', orders: 189, rating: 4.8 },
    { name: 'Electronics Plus', revenue: '$32,890', orders: 156, rating: 4.7 },
    { name: 'Home & Garden', revenue: '$28,450', orders: 134, rating: 4.6 }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.dashboard')}</h1>
          <p className="text-gray-600">{t('admin.welcomeBack')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
            📊 {t('sales.exportReport')}
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            📅 {t('admin.customRange')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <span className={`text-sm font-medium ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {stat.changeType === 'increase' ? '↗' : '↘'} {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('sales.salesOverview')}</h3>
            <select className="text-sm border border-gray-300 rounded-md px-3 py-1">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 3 months</option>
            </select>
          </div>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">📈</div>
              <p className="text-gray-500">Sales chart would go here</p>
              <p className="text-sm text-gray-400">Integration with Chart.js or similar</p>
            </div>
          </div>
        </div>

        {/* Top Vendors */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('admin.topPerformingStores')}</h3>
            <button className="text-sm text-yellow-600 hover:text-yellow-500">{t('admin.viewDetails')}</button>
          </div>
          <div className="space-y-4">
            {topVendors.map((vendor, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                    {vendor.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{vendor.name}</p>
                    <p className="text-sm text-gray-500">{vendor.orders} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{vendor.revenue}</p>
                  <div className="flex items-center">
                    <span className="text-yellow-400">⭐</span>
                    <span className="text-sm text-gray-600 ml-1">{vendor.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{t('admin.recentOrders')}</h3>
            <button className="text-sm text-yellow-600 hover:text-yellow-500">{t('account.viewAllOrders')}</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.orderNumber')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.customer')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.vendor')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.amount')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('sales.transactionDate')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.map((order, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.customer}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.vendor}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                      }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-yellow-600 hover:text-yellow-500 mr-3">View</button>
                    <button className="text-blue-600 hover:text-blue-500">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
