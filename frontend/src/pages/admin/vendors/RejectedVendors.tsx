import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useVendorStore } from '../../../stores/vendor.store';

const RejectedVendors: React.FC = () => {
  const {
    vendors,
    loading,
    fetchVendors,
    updateVendorStatus,
    deleteVendor
  } = useVendorStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchVendors({ status: 'rejected' });
  }, [fetchVendors]);

  const rejectedVendors = vendors.filter(vendor =>
    vendor.status === 'rejected' &&
    (vendor.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contactEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleReactivateVendor = async (vendorId: string) => {
    if (window.confirm('Are you sure you want to reactivate this vendor? They will be moved to pending status.')) {
      try {
        await updateVendorStatus(vendorId, 'pending');
        toast.success('Vendor reactivated and moved to pending status');
      } catch (error) {
        toast.error('Failed to reactivate vendor');
      }
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this vendor? This action cannot be undone.')) {
      try {
        await deleteVendor(vendorId);
        toast.success('Vendor deleted permanently');
      } catch (error) {
        toast.error('Failed to delete vendor');
      }
    }
  };

  const openDetailsModal = (vendor: any) => {
    setSelectedVendor(vendor);
    setShowDetailsModal(true);
  };

  if (loading && vendors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rejected Vendors</h1>
          <p className="text-gray-600">Vendors whose applications were rejected</p>
        </div>
        <div className="text-sm text-red-600 font-medium">
          {rejectedVendors.length} Rejected Applications
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <input
          type="text"
          placeholder="Search rejected vendors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-red-600">{rejectedVendors.length}</div>
          <div className="text-sm text-gray-600">Total Rejected</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-orange-600">
            {rejectedVendors.filter(v => new Date(v.updatedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
          </div>
          <div className="text-sm text-gray-600">Rejected This Month</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {rejectedVendors.filter(v => v.rejectionReason?.includes('documentation')).length}
          </div>
          <div className="text-sm text-gray-600">Documentation Issues</div>
        </div>
      </div>

      {/* Rejected Vendors Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rejection Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rejected Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rejectedVendors.map((vendor) => (
                <tr key={vendor._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                          <span className="text-white font-medium">
                            {vendor.businessName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {vendor.businessName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {vendor.legalEntityType}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{vendor.contactEmail}</div>
                    <div className="text-sm text-gray-500">{vendor.contactPhone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {vendor.rejectionReason || 'No reason provided'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(vendor.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openDetailsModal(vendor)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleReactivateVendor(vendor._id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Reactivate
                      </button>
                      <button
                        onClick={() => handleDeleteVendor(vendor._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rejectedVendors.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No rejected vendors</h3>
            <p className="text-gray-500">All vendor applications are either approved or pending</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Rejected Vendor Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">Application Date</label>
                  <p className="text-sm text-gray-900">{new Date(selectedVendor.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rejection Date</label>
                  <p className="text-sm text-gray-900">{new Date(selectedVendor.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedVendor.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-red-800 mb-2">Rejection Reason</label>
                  <p className="text-sm text-red-700">{selectedVendor.rejectionReason}</p>
                </div>
              )}

              {selectedVendor.businessDescription && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Description</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{selectedVendor.businessDescription}</p>
                </div>
              )}

              {selectedVendor.businessAddress && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Address</label>
                  <p className="text-sm text-gray-900">{selectedVendor.businessAddress}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleReactivateVendor(selectedVendor._id);
                  setShowDetailsModal(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Reactivate
              </button>
              <button
                onClick={() => {
                  handleDeleteVendor(selectedVendor._id);
                  setShowDetailsModal(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RejectedVendors;
