import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useVendorStore } from '../../../stores/vendor.store';
// import type { Vendor } from '../../../types/vendor.type';

const VendorRequests: React.FC = () => {
  const { t } = useTranslation();
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
    if (window.confirm(t('vendorRequests.actions.approveConfirm'))) {
      try {
        await approveVendor(vendorId);
        toast.success(t('vendorRequests.actions.approveSuccess'));
      } catch (error) {
        toast.error(t('vendorRequests.actions.approveFail'));
      }
    }
  };

  const handleReject = async () => {
    if (!selectedVendorId || !rejectionReason.trim()) {
      toast.error(t('vendorRequests.actions.rejectError'));
      return;
    }

    try {
      await rejectVendor(selectedVendorId, rejectionReason);
      toast.success(t('vendorRequests.actions.rejectSuccess'));
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedVendorId(null);
    } catch (error) {
      toast.error(t('vendorRequests.actions.rejectFail'));
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

  if (loading && vendors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('vendorRequests.title')}</h1>
          <p className="text-gray-600">{t('vendorRequests.subtitle')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('vendorRequests.searchPlaceholder')}
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
              <option value="pending">{t('admin.pending')}</option>
              <option value="approved">{t('admin.approved')}</option>
              <option value="rejected">{t('admin.rejected')}</option>
              <option value="active">{t('admin.active')}</option>
              {/* <option value="suspended">{t('admin.suspended')}</option> */}
              <option value="">{t('vendorRequests.allStatus')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('vendorRequests.columns.business')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('vendorRequests.columns.contact')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('vendorRequests.columns.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('vendorRequests.columns.appliedDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('vendorRequests.columns.categories')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('vendorRequests.columns.actions')}
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
                        title={t('vendorRequests.details.viewDetails')}
                        disabled={loading && selectedVendorId === vendor._id}
                      >
                        {loading && selectedVendorId === vendor._id ? (
                          <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block"></span>
                        ) : '👁️'}
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

        {/* Mobile cards */}
        <div className="lg:hidden p-4 space-y-4">
          {filteredVendors.map((vendor) => (
            <div key={vendor._id} className="border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold text-gray-900">{vendor.businessName}</div>
                  <div className="text-sm text-gray-500">{vendor.businessType}</div>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vendor.status)}`}>
                  {vendor.status}
                </span>
              </div>

              <div className="text-sm text-gray-900">{vendor.contactPersonName}</div>
              <div className="text-xs text-gray-500">{vendor.email}</div>
              <div className="text-xs text-gray-500">{vendor.phone}</div>

              <div className="text-xs text-gray-500">
                {t('vendorRequests.columns.appliedDate')}: {formatDate(vendor.createdAt)}
              </div>
              <div className="text-xs text-gray-500">
                {t('vendorRequests.columns.categories')}: {vendor.productCategories.slice(0, 2).join(', ')}
                {vendor.productCategories.length > 2 && (
                  <span className="text-gray-500"> +{vendor.productCategories.length - 2} more</span>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 text-sm font-medium">
                <button
                  onClick={() => handleViewDetails(vendor._id)}
                  className="text-blue-600 hover:text-blue-500"
                  title={t('vendorRequests.details.viewDetails')}
                  disabled={loading && selectedVendorId === vendor._id}
                >
                  {loading && selectedVendorId === vendor._id ? (
                    <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block"></span>
                  ) : '👁️'}
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
            </div>
          ))}

          {filteredVendors.length === 0 && (
            <div className="text-center text-gray-500 text-sm">
              {t('vendorRequests.noVendors')}
            </div>
          )}
        </div>

        {filteredVendors.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">{t('vendorRequests.noVendors')}</div>
            <p className="text-gray-400 mt-2">
              {statusFilter === 'pending'
                ? t('vendorRequests.noPending')
                : t('vendorRequests.noStatus', { status: statusFilter })
              }
            </p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('vendorRequests.modals.rejectTitle')}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('vendorRequests.modals.rejectionReason')}
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('vendorRequests.modals.rejectionReasonPlaceholder')}
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
                {t('vendorRequests.modals.cancel')}
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {t('vendorRequests.modals.reject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {t('vendorRequests.modals.detailsTitle')}
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
                  <h4 className="text-lg font-semibold text-gray-900">{t('vendorRequests.details.businessInfo')}</h4>
                  <div className="space-y-2">
                    <p><strong>{t('vendorRequests.columns.business')}:</strong> {selectedVendor.businessName}</p>
                    <p><strong>Business Type:</strong> {selectedVendor.businessType}</p>
                    <p><strong>{t('vendorRequests.columns.contact')}:</strong> {selectedVendor.contactPersonName}</p>
                    <p><strong>{t('admin.email')}:</strong> {selectedVendor.email}</p>
                    <p><strong>{t('admin.vendorRequests.details.storePhone')}:</strong> {selectedVendor.phone}</p>
                    {selectedVendor.alternativePhone && (
                      <p><strong>Alt Phone:</strong> {selectedVendor.alternativePhone}</p>
                    )}
                  </div>
                </div>

                {/* Legal Entity */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">{t('vendorRequests.details.legalEntity')}</h4>
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
                  <h4 className="text-lg font-semibold text-gray-900">{t('vendorRequests.details.address')}</h4>
                  <div className="space-y-2">
                    <p><strong>{t('vendorRequests.details.address')}:</strong> {selectedVendor.address}</p>
                    <p><strong>{t('common.city')}:</strong> {selectedVendor.city}</p>
                    <p><strong>Governorate:</strong> {selectedVendor.governorate}</p>
                    {selectedVendor.postalCode && (
                      <p><strong>Postal Code:</strong> {selectedVendor.postalCode}</p>
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">{t('vendorRequests.details.productCategories')}</h4>
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
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('vendorRequests.details.businessDescription')}</h4>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-md">
                  {selectedVendor.businessDescription}
                </p>
              </div>

              {/* Documents */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('vendorRequests.details.documents')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedVendor.documents.commercialRegistration && (
                    <div className="text-center">
                      <div className="text-2xl mb-2">📄</div>
                      <p className="text-sm text-gray-600">{t('vendorRequests.details.commercialRegistration')}</p>
                      <a
                        href={selectedVendor.documents.commercialRegistration}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {t('vendorRequests.details.viewDocument')}
                      </a>
                    </div>
                  )}
                  {selectedVendor.documents.taxCard && (
                    <div className="text-center">
                      <div className="text-2xl mb-2">📄</div>
                      <p className="text-sm text-gray-600">{t('vendorRequests.details.taxCard')}</p>
                      <a
                        href={selectedVendor.documents.taxCard}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {t('vendorRequests.details.viewDocument')}
                      </a>
                    </div>
                  )}
                  {selectedVendor.documents.nationalId && (
                    <div className="text-center">
                      <div className="text-2xl mb-2">🆔</div>
                      <p className="text-sm text-gray-600">{t('vendorRequests.details.nationalId')}</p>
                      <a
                        href={selectedVendor.documents.nationalId}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {t('vendorRequests.details.viewDocument')}
                      </a>
                    </div>
                  )}
                  {selectedVendor.documents.bankStatement && (
                    <div className="text-center">
                      <div className="text-2xl mb-2">🏦</div>
                      <p className="text-sm text-gray-600">{t('vendorRequests.details.bankStatement')}</p>
                      <a
                        href={selectedVendor.documents.bankStatement}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {t('vendorRequests.details.viewDocument')}
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
                    {t('vendorRequests.details.rejectApp')}
                  </button>
                  <button
                    onClick={() => {
                      handleApprove(selectedVendor._id);
                      setShowDetailsModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    {t('vendorRequests.details.approveApp')}
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
