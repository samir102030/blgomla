import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useVendorStore } from '../../../stores/vendor.store';

const AllVendors: React.FC = () => {
  const { t } = useTranslation();
  const {
    vendors,
    loading,
    fetchVendors,
    updateVendorStatus,
    deleteVendor
  } = useVendorStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (vendorId: string, newStatus: string) => {
    try {
      await updateVendorStatus(vendorId, newStatus);
      toast.success(t("vendorManagement.messages.statusUpdateSuccess", { status: newStatus }));
    } catch (error) {
      toast.error(t("vendorManagement.messages.statusUpdateError"));
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (window.confirm(t("allVendors.messages.deleteConfirm"))) {
      try {
        await deleteVendor(vendorId);
        toast.success(t("vendorManagement.messages.deleteSuccess"));
      } catch (error) {
        toast.error(t("vendorManagement.messages.deleteError"));
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      suspended: 'bg-gray-100 text-gray-800'
    };
    return statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800';
  };

  const openDetailsModal = (vendor: any) => {
    setSelectedVendor(vendor);
    setShowDetailsModal(true);
  };

  if (loading && (!vendors || vendors.length === 0)) {
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
          <h1 className="text-2xl font-bold text-gray-900">{t("allVendors.title")}</h1>
          <p className="text-gray-600">{t("allVendors.subtitle")}</p>
        </div>
        <div className="text-sm text-gray-500">
          Total: {filteredVendors.length} vendors
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t("allVendors.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t("vendorManagement.filters.allStatus")}</option>
              <option value="pending">{t("vendorManagement.filters.pending")}</option>
              <option value="approved">{t("vendorManagement.filters.approved")}</option>
              <option value="rejected">{t("vendorManagement.filters.rejected")}</option>
              <option value="suspended">{t("vendorManagement.filters.suspended")}</option>
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
                  {t("vendorManagement.table.vendor")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("vendorManagement.table.contact")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("vendorManagement.table.status")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("vendorManagement.table.registrationDate")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("vendorManagement.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVendors.map((vendor) => (
                <tr key={vendor._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(vendor.status)}`}>
                      {vendor.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(vendor.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openDetailsModal(vendor)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {t("vendorManagement.table.view")}
                      </button>
                      <select
                        value={vendor.status}
                        onChange={(e) => handleStatusChange(vendor._id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="pending">{t("vendorManagement.filters.pending")}</option>
                        <option value="approved">{t("vendorManagement.filters.approved")}</option>
                        <option value="rejected">{t("vendorManagement.filters.rejected")}</option>
                        <option value="suspended">{t("vendorManagement.filters.suspended")}</option>
                      </select>
                      <button
                        onClick={() => handleDeleteVendor(vendor._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        {t("vendorManagement.table.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVendors.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">{t("vendorManagement.table.empty")}</div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t("vendorManagement.modal.title")}</h2>
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
                  <label className="block text-sm font-medium text-gray-700">{t("vendorManagement.modal.businessName")}</label>
                  <p className="text-sm text-gray-900">{selectedVendor.businessName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t("vendorManagement.modal.legalEntityType")}</label>
                  <p className="text-sm text-gray-900">{selectedVendor.legalEntityType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t("vendorManagement.modal.contactEmail")}</label>
                  <p className="text-sm text-gray-900">{selectedVendor.contactEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t("vendorManagement.modal.contactPhone")}</label>
                  <p className="text-sm text-gray-900">{selectedVendor.contactPhone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t("vendorManagement.table.status")}</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedVendor.status)}`}>
                    {selectedVendor.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t("vendorManagement.table.registrationDate")}</label>
                  <p className="text-sm text-gray-900">{new Date(selectedVendor.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedVendor.businessDescription && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t("vendorManagement.modal.businessDescription")}</label>
                  <p className="text-sm text-gray-900">{selectedVendor.businessDescription}</p>
                </div>
              )}

              {selectedVendor.businessAddress && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t("vendorManagement.modal.businessAddress")}</label>
                  <p className="text-sm text-gray-900">{selectedVendor.businessAddress}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                {t("vendorManagement.modal.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllVendors;
