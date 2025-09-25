import React, { useEffect } from 'react';
import { useVendorStore } from '../../stores/vendor.store';
import { useUserStore } from '../../stores/user.store';

const VendorDashboard: React.FC = () => {
  const { user } = useUserStore();
  const { 
    dashboardStats, 
    vendorStore, 
    loading, 
    fetchDashboardStats, 
    fetchVendorStore 
  } = useVendorStore();

  useEffect(() => {
    if (user?.role === 'store') {
      fetchDashboardStats();
      fetchVendorStore();
    }
  }, [user, fetchDashboardStats, fetchVendorStore]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {vendorStore?.name || user?.name}! 👋
        </h1>
        <p className="text-yellow-100">
          Here's what's happening with your store today.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-lg">📦</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats?.totalProducts || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-lg">🛒</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats?.totalOrders || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 text-lg">💰</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${dashboardStats?.totalRevenue?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-lg">⭐</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats?.averageRating?.toFixed(1) || '0.0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-blue-600 text-lg">➕</span>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Add Product</p>
              <p className="text-sm text-gray-500">Create new product</p>
            </div>
          </button>

          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-green-600 text-lg">📋</span>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">View Orders</p>
              <p className="text-sm text-gray-500">Manage your orders</p>
            </div>
          </button>

          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-yellow-600 text-lg">🏪</span>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Store Settings</p>
              <p className="text-sm text-gray-500">Customize your store</p>
            </div>
          </button>

          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-purple-600 text-lg">📊</span>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Analytics</p>
              <p className="text-sm text-gray-500">View performance</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity & Pending Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <button className="text-yellow-600 hover:text-yellow-700 text-sm font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {/* Placeholder for recent orders */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 text-sm font-medium">#001</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Order #12345</p>
                  <p className="text-sm text-gray-500">2 items • $45.99</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                Pending
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-green-600 text-sm font-medium">#002</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Order #12344</p>
                  <p className="text-sm text-gray-500">1 item • $29.99</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Completed
              </span>
            </div>

            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">No more recent orders</p>
            </div>
          </div>
        </div>

        {/* Store Performance */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Store Performance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Active Products</span>
              <span className="text-sm font-bold text-gray-900">
                {dashboardStats?.activeProducts || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ 
                  width: `${dashboardStats?.totalProducts ? 
                    (dashboardStats.activeProducts / dashboardStats.totalProducts) * 100 : 0}%` 
                }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Pending Orders</span>
              <span className="text-sm font-bold text-gray-900">
                {dashboardStats?.pendingOrders || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-yellow-600 h-2 rounded-full" 
                style={{ 
                  width: `${dashboardStats?.totalOrders ? 
                    (dashboardStats.pendingOrders / dashboardStats.totalOrders) * 100 : 0}%` 
                }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Monthly Revenue</span>
              <span className="text-sm font-bold text-gray-900">
                ${dashboardStats?.monthlyRevenue?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ 
                  width: `${dashboardStats?.totalRevenue ? 
                    (dashboardStats.monthlyRevenue / dashboardStats.totalRevenue) * 100 : 0}%` 
                }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Customer Reviews</span>
              <span className="text-sm font-bold text-gray-900">
                {dashboardStats?.totalReviews || 0} reviews
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Store Status */}
      {vendorStore && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Store Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Store Details</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {vendorStore.name}</p>
                <p><strong>Email:</strong> {vendorStore.email || 'Not set'}</p>
                <p><strong>Phone:</strong> {vendorStore.phone || 'Not set'}</p>
                <p><strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    vendorStore.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {vendorStore.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Store Metrics</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Subscribers:</strong> {vendorStore.subscribers?.length || 0}</p>
                <p><strong>Social Links:</strong> {vendorStore.socialLinks?.length || 0}</p>
                <p><strong>Features:</strong> {vendorStore.features?.length || 0}</p>
                <p><strong>Created:</strong> {new Date(vendorStore.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
