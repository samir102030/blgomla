import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useVendorStore } from "../../../stores/vendor.store";

const VendorManagement: React.FC = () => {
  console.log("VendorManagement component rendered");

  const {
    vendors,
    loading,
    fetchVendors,
    updateVendorStatus,
    safeDeleteVendor,
    restoreVendor,
    approveVendor,
    rejectVendor,
    fetchVendorById,
  } = useVendorStore();

  console.log("Vendor store state:", { vendors, loading });

  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedVendorForDetails, setSelectedVendorForDetails] =
    useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [timeRange, setTimeRange] = useState("30d");

  useEffect(() => {
    console.log("Fetching vendors...");
    fetchVendors()
      .then(() => {
        console.log("Vendors fetched successfully");
      })
      .catch((error) => {
        console.error("Error fetching vendors:", error);
      });
  }, [fetchVendors]);

  const filteredVendors = (vendors || []).filter((vendor) => {
    const matchesSearch =
      vendor.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contactPersonName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      vendor.owner?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || vendor.status === statusFilter;
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "requests" && vendor.status === "pending") ||
      (activeTab === "approved" && vendor.status === "approved") ||
      (activeTab === "rejected" && vendor.status === "rejected") ||
      (activeTab === "deleted" && vendor.deleted);
    return matchesSearch && matchesStatus && matchesTab;
  });

  const handleStatusChange = async (vendorId: string, newStatus: string) => {
    try {
      await updateVendorStatus(vendorId, newStatus);
      toast.success(`Vendor status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update vendor status");
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this vendor? The vendor will be marked as deleted and can be restored later."
      )
    ) {
      try {
        await safeDeleteVendor(vendorId);
        toast.success("Vendor deleted successfully");
      } catch {
        toast.error("Failed to delete vendor");
      }
    }
  };

  const handleRestoreVendor = async (vendorId: string) => {
    if (
      window.confirm(
        "Are you sure you want to restore this vendor? The vendor will be reactivated."
      )
    ) {
      try {
        await restoreVendor(vendorId);
        toast.success("Vendor restored successfully");
      } catch {
        toast.error("Failed to restore vendor");
      }
    }
  };

  const handleApprove = async (vendorId: string) => {
    if (
      window.confirm(
        "Are you sure you want to approve this vendor? They will be able to start selling on the platform."
      )
    ) {
      try {
        await approveVendor(vendorId);
        toast.success(
          "Vendor approved successfully! They can now access their vendor dashboard."
        );
      } catch {
        toast.error("Failed to approve vendor");
      }
    }
  };

  const handleReject = async () => {
    if (!selectedVendorForDetails || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      await rejectVendor(selectedVendorForDetails._id, rejectionReason);
      toast.success("Vendor rejected successfully!");
      setShowRejectModal(false);
      setRejectionReason("");
      setSelectedVendorForDetails(null);
    } catch {
      toast.error("Failed to reject vendor");
    }
  };

  const handleViewDetails = async (vendor: any) => {
    setSelectedVendorForDetails(vendor);
    if (vendor._id) {
      await fetchVendorById(vendor._id);
    }
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status: string, deleted?: boolean) => {
    if (deleted) return "bg-gray-100 text-gray-800";
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      suspended: "bg-gray-100 text-gray-800",
      active: "bg-blue-100 text-blue-800",
    };
    return (
      statusStyles[status as keyof typeof statusStyles] ||
      "bg-gray-100 text-gray-800"
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusCounts = () => {
    const vendorList = vendors || [];
    const counts = {
      pending: vendorList.filter((v) => v.status === "pending").length,
      approved: vendorList.filter((v) => v.status === "approved").length,
      rejected: vendorList.filter((v) => v.status === "rejected").length,
      suspended: vendorList.filter((v) => v.status === "suspended").length,
      deleted: vendorList.filter((v) => v.deleted).length,
    };
    return counts;
  };

  const getRecentRegistrations = () => {
    const vendorList = vendors || [];
    const now = new Date();
    const ranges = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
    };
    const days = ranges[timeRange as keyof typeof ranges] || 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return vendorList.filter((v) => new Date(v.createdAt) > cutoff);
  };

  const statusCounts = getStatusCounts();
  const recentRegistrations = getRecentRegistrations();
  const totalVendors = (vendors || []).length;

  const tabs = [
    { id: "all", name: "All Vendors", count: totalVendors },
    { id: "requests", name: "Requests", count: statusCounts.pending },
    { id: "approved", name: "Approved", count: statusCounts.approved },
    { id: "rejected", name: "Rejected", count: statusCounts.rejected },
    { id: "deleted", name: "Deleted", count: statusCounts.deleted },
    { id: "analytics", name: "Analytics", count: null },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading vendors...</p>
      </div>
    );
  }

  // Add error boundary
  try {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Vendor Management
            </h1>
            <p className="text-gray-600">
              Manage all vendors and their applications
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.name}
                  {tab.count !== null && (
                    <span
                      className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        activeTab === tab.id
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab !== "analytics" && (
            <div className="p-6">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search vendors by name, email, or user account email..."
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
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="suspended">Suspended</option>
                    <option value="deleted">Deleted</option>
                  </select>
                </div>
              </div>

              {/* Vendors Table */}
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
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registration Date
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
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                  <span className="text-white font-medium">
                                    {vendor.businessName
                                      ?.charAt(0)
                                      .toUpperCase() || "?"}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {vendor.businessName || "N/A"}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {vendor.legalEntityType ||
                                    vendor.businessType ||
                                    "N/A"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {vendor.contactEmail || vendor.email || "N/A"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {vendor.contactPhone || vendor.phone || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                                vendor.status,
                                vendor.deleted
                              )}`}
                            >
                              {vendor.deleted ? "Deleted" : vendor.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vendor.createdAt
                              ? formatDate(vendor.createdAt)
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewDetails(vendor)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </button>
                              {activeTab === "requests" &&
                                vendor.status === "pending" && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(vendor._id)}
                                      className="text-green-600 hover:text-green-900"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedVendorForDetails(vendor);
                                        setShowRejectModal(true);
                                      }}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              {activeTab === "deleted" && vendor.deleted ? (
                                <button
                                  onClick={() =>
                                    handleRestoreVendor(vendor._id)
                                  }
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Restore
                                </button>
                              ) : (
                                !vendor.deleted && (
                                  <>
                                    <select
                                      value={vendor.status}
                                      onChange={(e) =>
                                        handleStatusChange(
                                          vendor._id,
                                          e.target.value
                                        )
                                      }
                                      className="text-xs border border-gray-300 rounded px-2 py-1"
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="approved">Approved</option>
                                      <option value="rejected">Rejected</option>
                                      <option value="suspended">
                                        Suspended
                                      </option>
                                    </select>
                                    <button
                                      onClick={() =>
                                        handleDeleteVendor(vendor._id)
                                      }
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )
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
                    <div className="text-gray-500">
                      No vendors found matching your criteria
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="p-6">
              {/* Time Range Selector */}
              <div className="flex justify-end mb-6">
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

              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <span className="text-2xl">🏪</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total Vendors
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {totalVendors}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <span className="text-2xl">✅</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Approved
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {statusCounts.approved}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <span className="text-2xl">⏳</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Pending
                      </p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {statusCounts.pending}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <span className="text-2xl">❌</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Rejected
                      </p>
                      <p className="text-2xl font-bold text-red-600">
                        {statusCounts.rejected}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Status Distribution */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Vendor Status Distribution
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                        <span className="text-sm text-gray-600">Approved</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 mr-2">
                          {statusCounts.approved}
                        </span>
                        <span className="text-xs text-gray-500">
                          (
                          {totalVendors > 0
                            ? Math.round(
                                (statusCounts.approved / totalVendors) * 100
                              )
                            : 0}
                          %)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                        <span className="text-sm text-gray-600">Pending</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 mr-2">
                          {statusCounts.pending}
                        </span>
                        <span className="text-xs text-gray-500">
                          (
                          {totalVendors > 0
                            ? Math.round(
                                (statusCounts.pending / totalVendors) * 100
                              )
                            : 0}
                          %)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                        <span className="text-sm text-gray-600">Rejected</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 mr-2">
                          {statusCounts.rejected}
                        </span>
                        <span className="text-xs text-gray-500">
                          (
                          {totalVendors > 0
                            ? Math.round(
                                (statusCounts.rejected / totalVendors) * 100
                              )
                            : 0}
                          %)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-gray-500 rounded mr-3"></div>
                        <span className="text-sm text-gray-600">Deleted</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 mr-2">
                          {statusCounts.deleted}
                        </span>
                        <span className="text-xs text-gray-500">
                          (
                          {totalVendors > 0
                            ? Math.round(
                                (statusCounts.deleted / totalVendors) * 100
                              )
                            : 0}
                          %)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        New registrations
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        {recentRegistrations.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Approval rate
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        {recentRegistrations.length > 0
                          ? Math.round(
                              (recentRegistrations.filter(
                                (v) => v.status === "approved"
                              ).length /
                                recentRegistrations.length) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Pending reviews
                      </span>
                      <span className="text-lg font-bold text-yellow-600">
                        {statusCounts.pending}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Vendors Table */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Recent Vendor Applications
                  </h3>
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
                            <div className="text-sm font-medium text-gray-900">
                              {vendor.businessName || "N/A"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {vendor.contactEmail || vendor.email || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                                vendor.status,
                                vendor.deleted
                              )}`}
                            >
                              {vendor.deleted ? "Deleted" : vendor.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vendor.createdAt
                              ? formatDate(vendor.createdAt)
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vendor.productCategories?.[0] || "Not specified"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Details Modal */}
        {showDetailsModal && selectedVendorForDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Vendor Details
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* User Account Information */}
                {selectedVendorForDetails.owner && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      User Account Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Account Name
                        </label>
                        <p className="text-sm text-gray-900">
                          {selectedVendorForDetails.owner.name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Account Email
                        </label>
                        <p className="text-sm text-gray-900">
                          {selectedVendorForDetails.owner.email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Phone Number
                        </label>
                        <p className="text-sm text-gray-900">
                          {selectedVendorForDetails.owner.phoneNumber || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Account Role
                        </label>
                        <p className="text-sm text-gray-900">
                          {selectedVendorForDetails.owner.role || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Account Status
                        </label>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedVendorForDetails.owner.isVerified
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {selectedVendorForDetails.owner.isVerified
                            ? "Verified"
                            : "Unverified"}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Account Active
                        </label>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedVendorForDetails.owner.active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {selectedVendorForDetails.owner.active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Business Name
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedVendorForDetails.businessName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Legal Entity Type
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedVendorForDetails.legalEntityType ||
                        selectedVendorForDetails.businessType ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Contact Email
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedVendorForDetails.contactEmail ||
                        selectedVendorForDetails.email ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Contact Phone
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedVendorForDetails.contactPhone ||
                        selectedVendorForDetails.phone ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                        selectedVendorForDetails.status,
                        selectedVendorForDetails.deleted
                      )}`}
                    >
                      {selectedVendorForDetails.deleted
                        ? "Deleted"
                        : selectedVendorForDetails.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Registration Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedVendorForDetails.createdAt
                        ? formatDate(selectedVendorForDetails.createdAt)
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {selectedVendorForDetails.businessDescription && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Business Description
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedVendorForDetails.businessDescription}
                    </p>
                  </div>
                )}

                {selectedVendorForDetails.productCategories &&
                  selectedVendorForDetails.productCategories.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Product Categories
                      </label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedVendorForDetails.productCategories.map(
                          (category: string, index: number) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {category}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

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
                    setRejectionReason("");
                    setSelectedVendorForDetails(null);
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
      </div>
    );
  } catch (error) {
    console.error("Error in VendorManagement component:", error);
    return (
      <div className="p-8 bg-red-100 border border-red-400 text-red-700 rounded">
        <h2 className="text-xl font-bold mb-4">
          Error Loading Vendor Management
        </h2>
        <p>An error occurred while loading the vendor management page.</p>
        <p className="mt-2">
          <strong>Error:</strong>{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <p className="mt-4 text-sm">
          Please check the console for more details.
        </p>
      </div>
    );
  }
};

export default VendorManagement;
