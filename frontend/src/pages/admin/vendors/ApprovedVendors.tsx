import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useVendorStore } from '../../../stores/vendor.store';

const ApprovedVendors: React.FC = () => {
  const { 
    vendors, 
    loading, 
    fetchVendors, 
    updateVendorStatus 
  } = useVendorStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchVendors({ status: 'approved' });
  }, [fetchVendors]);

  const approvedVendors = vendors.filter(vendor => 
    vendor.status === 'approved' &&
    (vendor.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     vendor.contactEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSuspendVendor = async (vendorId: string) => {
    if (window.confirm('Are you sure you want to suspend this vendor?')) {
      try {
        await updateVendorStatus(vendorId, 'suspended');
        toast.success('Vendor suspended successfully');
      } catch (error) {
        toast.error('Failed to suspend vendor');
      }
    }
  };

  const openDetailsModal = (vendor: any) => {
    setSelectedVendor(vendor);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approved Vendors</h1>
          <p className="text-gray-600">Active vendors in the marketplace</p>
        </div>
        <div className="text-sm text-green-600 font-medium">
          {approvedVendors.length} Active Vendors
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <input
          type="text"
          placeholder="Search approved vendors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">{approvedVendors.length}</div>
          <div className="text-sm text-gray-600">Total Approved</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {approvedVendors.filter(v => new Date(v.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
          </div>
          <div className="text-sm text-gray-600">New This Month</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-purple-600">
            {approvedVendors.filter(v => v.store?.isActive).length}
          </div>
          <div className="text-sm text-gray-600">Active Stores</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-orange-600">
            {approvedVendors.reduce((sum, v) => sum + (v.store?.productCount || 0), 0)}
          </div>
          <div className="text-sm text-gray-600">Total Products</div>
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {approvedVendors.map((vendor) => (
          <div key={vendor._id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {vendor.businessName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">{vendor.businessName}</h3>
                    <p className="text-sm text-gray-500">{vendor.legalEntityType}</p>
                  </div>
                </div>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium">Email:</span>
                  <span className="ml-2">{vendor.contactEmail}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium">Phone:</span>
                  <span className="ml-2">{vendor.contactPhone}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium">Joined:</span>
                  <span className="ml-2">{new Date(vendor.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Store Info */}
              {vendor.store && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="text-sm font-medium text-gray-900 mb-1">Store Information</div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Products: {vendor.store.productCount || 0}</div>
                    <div>Orders: {vendor.store.orderCount || 0}</div>
                    <div>Rating: {vendor.store.rating || 'N/A'}</div>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-2">
                <button
                  onClick={() => openDetailsModal(vendor)}
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleSuspendVendor(vendor._id)}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Suspend
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {approvedVendors.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏪</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No approved vendors found</h3>
          <p className="text-gray-500">No vendors match your search criteria</p>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Vendor Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Name</label>
                    <p className="text-sm text-gray-900">{selectedVendor.businessName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Legal Entity Type</label>
                    <p className="text-sm text-gray-900">{selectedVendor.legalEntityType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                    <p className="text-sm text-gray-900">{selectedVendor.contactEmail}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                    <p className="text-sm text-gray-900">{selectedVendor.contactPhone}</p>
                  </div>
                </div>
              </div>

              {/* Store Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Store Performance</h3>
                {selectedVendor.store ? (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Store Name</label>
                      <p className="text-sm text-gray-900">{selectedVendor.store.name || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Products</label>
                      <p className="text-sm text-gray-900">{selectedVendor.store.productCount || 0}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Orders</label>
                      <p className="text-sm text-gray-900">{selectedVendor.store.orderCount || 0}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Rating</label>
                      <p className="text-sm text-gray-900">{selectedVendor.store.rating || 'No ratings yet'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Store Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedVendor.store.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedVendor.store.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Store not yet created</p>
                )}
              </div>
            </div>
            
            {selectedVendor.businessDescription && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{selectedVendor.businessDescription}</p>
              </div>
            )}
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleSuspendVendor(selectedVendor._id);
                  setShowDetailsModal(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Suspend Vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovedVendors;
