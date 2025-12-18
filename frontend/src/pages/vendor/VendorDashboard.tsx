import React, { useEffect } from 'react';
import { useVendorStore } from '../../stores/vendor.store';
import { useUserStore } from '../../stores/user.store';
import { useTranslation } from 'react-i18next';

const VendorDashboard: React.FC = () => {
  const { t } = useTranslation();
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
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg p-4 sm:p-6 text-white">
        <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">
          {t('vendor.welcomeBack', { name: vendorStore?.name || user?.name })} 👋
        </h1>
        <p className="text-xs sm:text-sm lg:text-base text-yellow-100">
          {t('vendor.storeToday')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex-shrink-0">
              <div className="w-7 sm:w-8 h-7 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-base sm:text-lg">📦</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">{t('vendor.totalProducts')}</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {dashboardStats?.totalProducts || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex-shrink-0">
              <div className="w-7 sm:w-8 h-7 sm:h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-base sm:text-lg">🛒</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">{t('vendor.totalOrders')}</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {dashboardStats?.totalOrders || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex-shrink-0">
              <div className="w-7 sm:w-8 h-7 sm:h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 text-base sm:text-lg">💰</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">{t('vendor.totalRevenue')}</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                ${dashboardStats?.totalRevenue?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex-shrink-0">
              <div className="w-7 sm:w-8 h-7 sm:h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-base sm:text-lg">⭐</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">{t('vendor.averageRating')}</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {dashboardStats?.averageRating?.toFixed(1) || '0.0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('vendor.quickActions')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          <button className="flex flex-col sm:flex-row sm:items-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors gap-2 sm:gap-3">
            <div className="w-8 sm:w-10 h-8 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 text-sm sm:text-lg">➕</span>
            </div>
            <div className="text-left">
              <p className="font-medium text-xs sm:text-sm lg:text-base text-gray-900">{t('vendor.addProduct')}</p>
              <p className="text-xs text-gray-500 hidden sm:block">{t('vendor.createNewProduct')}</p>
            </div>
          </button>

          <button className="flex flex-col sm:flex-row sm:items-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors gap-2 sm:gap-3">
            <div className="w-8 sm:w-10 h-8 sm:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 text-sm sm:text-lg">📋</span>
            </div>
            <div className="text-left">
              <p className="font-medium text-xs sm:text-sm lg:text-base text-gray-900">{t('vendor.viewOrders')}</p>
              <p className="text-xs text-gray-500 hidden sm:block">{t('vendor.manageOrders')}</p>
            </div>
          </button>

          <button className="flex flex-col sm:flex-row sm:items-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors gap-2 sm:gap-3">
            <div className="w-8 sm:w-10 h-8 sm:h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-yellow-600 text-sm sm:text-lg">🏪</span>
            </div>
            <div className="text-left">
              <p className="font-medium text-xs sm:text-sm lg:text-base text-gray-900">{t('vendor.storeSettings')}</p>
              <p className="text-xs text-gray-500 hidden sm:block">{t('vendor.customizeStore')}</p>
            </div>
          </button>

          <button className="flex flex-col sm:flex-row sm:items-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors gap-2 sm:gap-3">
            <div className="w-8 sm:w-10 h-8 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 text-sm sm:text-lg">📊</span>
            </div>
            <div className="text-left">
              <p className="font-medium text-xs sm:text-sm lg:text-base text-gray-900">{t('vendor.analytics')}</p>
              <p className="text-xs text-gray-500 hidden sm:block">{t('vendor.viewPerformance')}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity & Pending Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('vendor.recentOrders')}</h2>
            <button className="text-yellow-600 hover:text-yellow-700 text-xs sm:text-sm font-medium">
              {t('vendor.viewAll')}
            </button>
          </div>
          <div className="space-y-2 sm:space-y-4">
            {/* Placeholder for recent orders */}
            <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 sm:w-10 h-8 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 text-xs sm:text-sm font-medium">#001</span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-xs sm:text-sm text-gray-900">{t('vendor.order')} #12345</p>
                  <p className="text-xs text-gray-500">2 {t('vendor.items')} • $45.99</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full flex-shrink-0">
                {t('vendor.pending')}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-green-600 text-sm font-medium">#002</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{t('vendor.order')} #12344</p>
                  <p className="text-sm text-gray-500">1 {t('vendor.item')} • $29.99</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                {t('vendor.completed')}
              </span>
            </div>

            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">{t('vendor.noMoreOrders')}</p>
            </div>
          </div>
        </div>

        {/* Store Performance */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('vendor.storePerformance')}</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">{t('vendor.activeProducts')}</span>
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
              <span className="text-sm font-medium text-gray-600">{t('vendor.pendingOrders')}</span>
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
              <span className="text-sm font-medium text-gray-600">{t('vendor.monthlyRevenue')}</span>
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
              <span className="text-sm font-medium text-gray-600">{t('vendor.customerReviews')}</span>
              <span className="text-sm font-bold text-gray-900">
                {dashboardStats?.totalReviews || 0} {t('vendor.reviews')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Store Status */}
      {vendorStore && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('vendor.storeInformation')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">{t('vendor.storeDetails')}</h3>
              <div className="space-y-2 text-sm">
                <p><strong>{t('vendor.name')}:</strong> {vendorStore.name}</p>
                <p><strong>{t('vendor.email')}:</strong> {vendorStore.email || t('vendor.notSet')}</p>
                <p><strong>{t('vendor.phone')}:</strong> {vendorStore.phone || t('vendor.notSet')}</p>
                <p><strong>{t('vendor.status')}:</strong>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    vendorStore.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {vendorStore.isActive ? t('vendor.active') : t('vendor.inactive')}
                  </span>
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">{t('vendor.storeMetrics')}</h3>
              <div className="space-y-2 text-sm">
                <p><strong>{t('vendor.subscribers')}:</strong> {vendorStore.subscribers?.length || 0}</p>
                <p><strong>{t('vendor.socialLinks')}:</strong> {vendorStore.socialLinks?.length || 0}</p>
                <p><strong>{t('vendor.features')}:</strong> {vendorStore.features?.length || 0}</p>
                <p><strong>{t('vendor.created')}:</strong> {new Date(vendorStore.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
