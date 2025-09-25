import React, { useState, useEffect } from 'react';
import { useVendorStore } from '../../../stores/vendor.store';

const VendorAnalytics: React.FC = () => {
  const { 
    vendors, 

    loading, 
    fetchVendors, 
    fetchVendorAnalytics 
  } = useVendorStore();

  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchVendors();
    fetchVendorAnalytics();
  }, [fetchVendors, fetchVendorAnalytics]);

  const getStatusCounts = () => {
    const counts = {
      pending: vendors.filter(v => v.status === 'pending').length,
      approved: vendors.filter(v => v.status === 'approved').length,
      rejected: vendors.filter(v => v.status === 'rejected').length,
      suspended: vendors.filter(v => v.status === 'suspended').length,
    };
    return counts;
  };

  const getRecentRegistrations = () => {
    const now = new Date();
    const ranges = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };
    const days = ranges[timeRange as keyof typeof ranges] || 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return vendors.filter(v => new Date(v.createdAt) > cutoff);
  };

  const statusCounts = getStatusCounts();
  const recentRegistrations = getRecentRegistrations();
  const totalVendors = vendors.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Analytics</h1>
          <p className="text-gray-600">Comprehensive vendor performance and statistics</p>
        </div>
        <div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">🏪</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Vendors</p>
              <p className="text-2xl font-bold text-gray-900">{totalVendors}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts.approved}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-2xl">❌</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{statusCounts.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Status Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                <span className="text-sm text-gray-600">Approved</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 mr-2">{statusCounts.approved}</span>
                <span className="text-xs text-gray-500">
                  ({totalVendors > 0 ? Math.round((statusCounts.approved / totalVendors) * 100) : 0}%)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                <span className="text-sm text-gray-600">Pending</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 mr-2">{statusCounts.pending}</span>
                <span className="text-xs text-gray-500">
                  ({totalVendors > 0 ? Math.round((statusCounts.pending / totalVendors) * 100) : 0}%)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                <span className="text-sm text-gray-600">Rejected</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 mr-2">{statusCounts.rejected}</span>
                <span className="text-xs text-gray-500">
                  ({totalVendors > 0 ? Math.round((statusCounts.rejected / totalVendors) * 100) : 0}%)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-500 rounded mr-3"></div>
                <span className="text-sm text-gray-600">Suspended</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 mr-2">{statusCounts.suspended}</span>
                <span className="text-xs text-gray-500">
                  ({totalVendors > 0 ? Math.round((statusCounts.suspended / totalVendors) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Registrations</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">New registrations</span>
              <span className="text-lg font-bold text-blue-600">{recentRegistrations.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Approval rate</span>
              <span className="text-lg font-bold text-green-600">
                {recentRegistrations.length > 0 
                  ? Math.round((recentRegistrations.filter(v => v.status === 'approved').length / recentRegistrations.length) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg. processing time</span>
              <span className="text-lg font-bold text-purple-600">2.3 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Vendors</h3>
          <div className="space-y-3">
            {vendors
              .filter(v => v.status === 'approved' && v.store)
              .sort((a, b) => (b.store?.orderCount || 0) - (a.store?.orderCount || 0))
              .slice(0, 5)
              .map((vendor, index) => (
                <div key={vendor._id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 mr-3">#{index + 1}</span>
                    <span className="text-sm text-gray-900">{vendor.businessName}</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600">
                    {vendor.store?.orderCount || 0} orders
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Electronics</span>
              <span className="text-sm font-medium text-gray-900">
                {vendors.filter(v => v.productCategories?.includes('Electronics')).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Fashion</span>
              <span className="text-sm font-medium text-gray-900">
                {vendors.filter(v => v.productCategories?.includes('Fashion')).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Home & Garden</span>
              <span className="text-sm font-medium text-gray-900">
                {vendors.filter(v => v.productCategories?.includes('Home & Garden')).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Sports</span>
              <span className="text-sm font-medium text-gray-900">
                {vendors.filter(v => v.productCategories?.includes('Sports')).length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active stores</span>
              <span className="text-sm font-medium text-green-600">
                {vendors.filter(v => v.store?.isActive).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total products</span>
              <span className="text-sm font-medium text-blue-600">
                {vendors.reduce((sum, v) => sum + (v.store?.productCount || 0), 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg. rating</span>
              <span className="text-sm font-medium text-yellow-600">4.2/5</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Response time</span>
              <span className="text-sm font-medium text-purple-600">1.8 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Vendors Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Vendor Applications</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentRegistrations.slice(0, 10).map((vendor) => (
                <tr key={vendor._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{vendor.businessName}</div>
                    <div className="text-sm text-gray-500">{vendor.contactEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      vendor.status === 'approved' ? 'bg-green-100 text-green-800' :
                      vendor.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      vendor.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {vendor.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(vendor.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vendor.productCategories?.[0] || 'Not specified'}
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

export default VendorAnalytics;
