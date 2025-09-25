import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useVendorStore } from '../../../stores/vendor.store';
// import type { Vendor } from '../../../types/vendor.type';

const VendorRequests: React.FC = () => {
  const { 
    vendors, 
    loading, 

    fetchVendors, 
    approveVendor, 
    rejectVendor,
    fetchVendorById,
    vendor: selectedVendor
  } = useVendorStore();

  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchVendors({ status: statusFilter });
  }, [statusFilter, fetchVendors]);

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.contactPersonName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleApprove = async (vendorId: string) => {
    if (window.confirm('Are you sure you want to approve this vendor? They will be able to start selling on the platform.')) {
      try {
        await approveVendor(vendorId);
        toast.success('Vendor approved successfully! They can now access their vendor dashboard.');
      } catch (error) {
        toast.error('Failed to approve vendor');
      }
    }
  };

  const handleReject = async () => {
    if (!selectedVendorId || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await rejectVendor(selectedVendorId, rejectionReason);
      toast.success('Vendor rejected successfully!');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedVendorId(null);
    } catch (error) {
      toast.error('Failed to reject vendor');
    }
  };

  const handleViewDetails = async (vendorId: string) => {
    setSelectedVendorId(vendorId);
    await fetchVendorById(vendorId);
    setShowDetailsModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Requests</h1>
          <p className="text-gray-600">Manage pending vendor applications</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="">All Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categories
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVendors.map((vendor) => (
                <tr key={vendor._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {vendor.businessName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {vendor.businessType}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {vendor.contactPersonName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {vendor.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {vendor.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vendor.status)}`}>
                      {vendor.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(vendor.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {vendor.productCategories.slice(0, 2).join(', ')}
                      {vendor.productCategories.length > 2 && (
                        <span className="text-gray-500">
                          {' '}+{vendor.productCategories.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(vendor._id)}
                        className="text-blue-600 hover:text-blue-500"
                        title="View Details"
                      >
                        👁️
                      </button>
                      {vendor.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(vendor._id)}
                            className="text-green-600 hover:text-green-500"
                            title="Approve"
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => {
                              setSelectedVendorId(vendor._id);
                              setShowRejectModal(true);
                            }}
                            className="text-red-600 hover:text-red-500"
                            title="Reject"
                          >
                            ❌
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVendors.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No vendors found</div>
            <p className="text-gray-400 mt-2">
              {statusFilter === 'pending' 
                ? 'No pending vendor applications at the moment.'
                : `No ${statusFilter} vendors found.`
              }
            </p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Reject Vendor Application
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedVendorId(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Vendor Application Details
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Business Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Business Information</h4>
                  <div className="space-y-2">
                    <p><strong>Business Name:</strong> {selectedVendor.businessName}</p>
                    <p><strong>Business Type:</strong> {selectedVendor.businessType}</p>
                    <p><strong>Contact Person:</strong> {selectedVendor.contactPersonName}</p>
                    <p><strong>Email:</strong> {selectedVendor.email}</p>
                    <p><strong>Phone:</strong> {selectedVendor.phone}</p>
                    {selectedVendor.alternativePhone && (
                      <p><strong>Alt Phone:</strong> {selectedVendor.alternativePhone}</p>
                    )}
                  </div>
                </div>

                {/* Legal Entity */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Legal Entity</h4>
                  <div className="space-y-2">
                    <p><strong>Authority:</strong> {selectedVendor.legalEntityType}</p>
                    <p><strong>License Number:</strong> {selectedVendor.licenseNumber}</p>
                    <p><strong>Company Name:</strong> {selectedVendor.companyName}</p>
                    <p><strong>Issue Date:</strong> {formatDate(selectedVendor.issueDate)}</p>
                    <p><strong>Expiry Date:</strong> {formatDate(selectedVendor.expiryDate)}</p>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Address</h4>
                  <div className="space-y-2">
                    <p><strong>Address:</strong> {selectedVendor.address}</p>
                    <p><strong>City:</strong> {selectedVendor.city}</p>
                    <p><strong>Governorate:</strong> {selectedVendor.governorate}</p>
                    {selectedVendor.postalCode && (
                      <p><strong>Postal Code:</strong> {selectedVendor.postalCode}</p>
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Product Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.productCategories.map((category, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Business Description */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Business Description</h4>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-md">
                  {selectedVendor.businessDescription}
                </p>
              </div>

              {/* Documents */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Documents</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedVendor.documents.commercialRegistration && (
                    <div className="text-center">
                      <div className="text-2xl mb-2">📄</div>
                      <p className="text-sm text-gray-600">Commercial Registration</p>
                      <a
                        href={selectedVendor.documents.commercialRegistration}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Document
                      </a>
                    </div>
                  )}
                  {selectedVendor.documents.taxCard && (
                    <div className="text-center">
                      <div className="text-2xl mb-2">📄</div>
                      <p className="text-sm text-gray-600">Tax Card</p>
                      <a
                        href={selectedVendor.documents.taxCard}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Document
                      </a>
                    </div>
                  )}
                  {selectedVendor.documents.nationalId && (
                    <div className="text-center">
                      <div className="text-2xl mb-2">🆔</div>
                      <p className="text-sm text-gray-600">National ID</p>
                      <a
                        href={selectedVendor.documents.nationalId}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Document
                      </a>
                    </div>
                  )}
                  {selectedVendor.documents.bankStatement && (
                    <div className="text-center">
                      <div className="text-2xl mb-2">🏦</div>
                      <p className="text-sm text-gray-600">Bank Statement</p>
                      <a
                        href={selectedVendor.documents.bankStatement}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Document
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {selectedVendor.status === 'pending' && (
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setSelectedVendorId(selectedVendor._id);
                      setShowDetailsModal(false);
                      setShowRejectModal(true);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Reject Application
                  </button>
                  <button
                    onClick={() => {
                      handleApprove(selectedVendor._id);
                      setShowDetailsModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Approve Application
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorRequests;
