import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useVendorStore } from '../../../stores/vendor.store';

const RejectedVendors: React.FC = () => {
  const { t } = useTranslation();
  const {
    vendors,
    loading,
    fetchVendors,
    updateVendorStatus,
    safeDeleteVendor
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
    if (window.confirm(t('rejectedVendors.confirmReactivate'))) {
      try {
        await updateVendorStatus(vendorId, 'pending');
        toast.success(t('rejectedVendors.reactivateSuccess'));
      } catch (error) {
        toast.error(t('rejectedVendors.reactivateFailed'));
      }
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (window.confirm(t('rejectedVendors.confirmDelete'))) {
      try {
        await safeDeleteVendor(vendorId);
        toast.success(t('rejectedVendors.deleteSuccess'));
      } catch (error) {
        toast.error(t('rejectedVendors.deleteFailed'));
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('rejectedVendors.title')}</h1>
          <p className="text-gray-600">{t('rejectedVendors.subtitle')}</p>
        </div>
        <div className="text-sm text-red-600 font-medium">
          {rejectedVendors.length} {t('rejectedVendors.rejectedApplications')}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <input
          type="text"
          placeholder={t('rejectedVendors.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-red-600">{rejectedVendors.length}</div>
          <div className="text-sm text-gray-600">{t('rejectedVendors.totalRejected')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-orange-600">
            {rejectedVendors.filter(v => new Date(v.updatedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
          </div>
          <div className="text-sm text-gray-600">{t('rejectedVendors.rejectedThisMonth')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-[var(--brand-primary)]">
            {rejectedVendors.filter(v => v.rejectionReason?.includes('documentation')).length}
          </div>
          <div className="text-sm text-gray-600">{t('rejectedVendors.documentationIssues')}</div>
        </div>
      </div>

      {/* Rejected Vendors Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('rejectedVendors.colVendor')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('rejectedVendors.colContact')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('rejectedVendors.colRejectionReason')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('rejectedVendors.colRejectedDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('rejectedVendors.colActions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rejectedVendors.map((vendor) => (
                <tr key={vendor._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                          <span className="text-white font-medium">
                            {vendor.businessName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
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
                      {vendor.rejectionReason || t('rejectedVendors.noReason')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(vendor.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openDetailsModal(vendor)}
                        className="text-[var(--brand-primary)] hover:text-[var(--brand-accent)]"
                      >
                        {t('rejectedVendors.view')}
                      </button>
                      <button
                        onClick={() => handleReactivateVendor(vendor._id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        {t('rejectedVendors.reactivate')}
                      </button>
                      <button
                        onClick={() => handleDeleteVendor(vendor._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        {t('rejectedVendors.delete')}
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
            <div className="text-6xl mb-4"><CheckCircleIcon className="w-9 h-9" aria-hidden="true" /></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('rejectedVendors.noRejected')}</h3>
            <p className="text-gray-500">{t('rejectedVendors.allApprovedOrPending')}</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t('rejectedVendors.vendorDetails')}</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="mt-6 flex flex-wrap justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                {t('rejectedVendors.close')}
              </button>
              <button
                onClick={() => {
                  handleReactivateVendor(selectedVendor._id);
                  setShowDetailsModal(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {t('rejectedVendors.reactivate')}
              </button>
              <button
                onClick={() => {
                  handleDeleteVendor(selectedVendor._id);
                  setShowDetailsModal(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {t('rejectedVendors.deletePermanently')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RejectedVendors;
