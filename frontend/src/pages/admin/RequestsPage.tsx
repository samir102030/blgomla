import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import {
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

interface BrandRequest {
  _id: string;
  name: string;
  description?: string;
  requestedBy: { _id: string; name: string; email: string };
  store: { _id: string; name: string };
  product: { _id: string; name: string };
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: string;
}

interface CategoryRequest {
  _id: string;
  name: string;
  description?: string;
  requestedBy: { _id: string; name: string; email: string };
  store: { _id: string; name: string };
  product: { _id: string; name: string };
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: string;
}

const RequestsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"brands" | "categories">("brands");
  const [brandRequests, setBrandRequests] = useState<BrandRequest[]>([]);
  const [categoryRequests, setCategoryRequests] = useState<CategoryRequest[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [brandsRes, categoriesRes] = await Promise.all([
        axiosInstance.get("/brand-requests"),
        axiosInstance.get("/category-requests"),
      ]);
      setBrandRequests(brandsRes.data.data || []);
      setCategoryRequests(categoriesRes.data.data || []);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBrand = async (requestId: string) => {
    try {
      await axiosInstance.post(`/brand-requests/${requestId}/approve`);
      toast.success("Brand request approved!");
      fetchRequests();
    } catch (error) {
      toast.error("Failed to approve brand request");
    }
  };

  const handleRejectBrand = async (requestId: string) => {
    const reason = prompt("Enter rejection reason (optional):");
    try {
      await axiosInstance.post(`/brand-requests/${requestId}/reject`, {
        reason: reason || "Not specified",
      });
      toast.success("Brand request rejected");
      fetchRequests();
    } catch (error) {
      toast.error("Failed to reject brand request");
    }
  };

  const handleApproveCategory = async (requestId: string) => {
    try {
      await axiosInstance.post(`/category-requests/${requestId}/approve`);
      toast.success("Category request approved!");
      fetchRequests();
    } catch (error) {
      toast.error("Failed to approve category request");
    }
  };

  const handleRejectCategory = async (requestId: string) => {
    const reason = prompt("Enter rejection reason (optional):");
    try {
      await axiosInstance.post(`/category-requests/${requestId}/reject`, {
        reason: reason || "Not specified",
      });
      toast.success("Category request rejected");
      fetchRequests();
    } catch (error) {
      toast.error("Failed to reject category request");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredBrandRequests = brandRequests.filter((req) => {
    const matchesSearch =
      req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requestedBy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.store.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredCategoryRequests = categoryRequests.filter((req) => {
    const matchesSearch =
      req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requestedBy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.store.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingBrands = brandRequests.filter(
    (r) => r.status === "pending"
  ).length;
  const pendingCategories = categoryRequests.filter(
    (r) => r.status === "pending"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#333333]">Vendor Requests</h1>
        <p className="text-[#9E9E9E]">
          Review and manage brand and category creation requests from vendors
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Brands</p>
              <p className="text-2xl font-bold text-yellow-600">
                {pendingBrands}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Categories</p>
              <p className="text-2xl font-bold text-yellow-600">
                {pendingCategories}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Brand Requests</p>
              <p className="text-2xl font-bold text-blue-600">
                {brandRequests.length}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <span className="text-2xl">🏷️</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Category Requests</p>
              <p className="text-2xl font-bold text-purple-600">
                {categoryRequests.length}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <span className="text-2xl">📁</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab("brands")}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === "brands"
                  ? "border-b-2 border-[#FFD600] text-[#333333] bg-[#FFD600]/10"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Brand Requests ({pendingBrands} pending)
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === "categories"
                  ? "border-b-2 border-[#FFD600] text-[#333333] bg-[#FFD600]/10"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Category Requests ({pendingCategories} pending)
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, vendor, or store..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD600] focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD600] focus:border-transparent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">Loading requests...</div>
          ) : activeTab === "brands" ? (
            <div className="space-y-4">
              {filteredBrandRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No brand requests found
                </div>
              ) : (
                filteredBrandRequests.map((request) => (
                  <div
                    key={request._id}
                    className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {request.name}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                              request.status
                            )}`}
                          >
                            {request.status.charAt(0).toUpperCase() +
                              request.status.slice(1)}
                          </span>
                        </div>
                        {request.description && (
                          <p className="text-sm text-gray-600 mb-3">
                            {request.description}
                          </p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Vendor:</span>{" "}
                            <span className="font-medium">
                              {request.requestedBy.name}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Store:</span>{" "}
                            <span className="font-medium">
                              {request.store.name}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Product:</span>{" "}
                            <span className="font-medium">
                              {request.product.name}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          Requested on{" "}
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                        {request.status === "rejected" &&
                          request.rejectionReason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              <strong>Rejection reason:</strong>{" "}
                              {request.rejectionReason}
                            </div>
                          )}
                      </div>
                      {request.status === "pending" && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleApproveBrand(request._id)}
                            className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors"
                            title="Approve"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleRejectBrand(request._id)}
                            className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                            title="Reject"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCategoryRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No category requests found
                </div>
              ) : (
                filteredCategoryRequests.map((request) => (
                  <div
                    key={request._id}
                    className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {request.name}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                              request.status
                            )}`}
                          >
                            {request.status.charAt(0).toUpperCase() +
                              request.status.slice(1)}
                          </span>
                        </div>
                        {request.description && (
                          <p className="text-sm text-gray-600 mb-3">
                            {request.description}
                          </p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Vendor:</span>{" "}
                            <span className="font-medium">
                              {request.requestedBy.name}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Store:</span>{" "}
                            <span className="font-medium">
                              {request.store.name}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Product:</span>{" "}
                            <span className="font-medium">
                              {request.product.name}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          Requested on{" "}
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                        {request.status === "rejected" &&
                          request.rejectionReason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              <strong>Rejection reason:</strong>{" "}
                              {request.rejectionReason}
                            </div>
                          )}
                      </div>
                      {request.status === "pending" && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleApproveCategory(request._id)}
                            className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors"
                            title="Approve"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleRejectCategory(request._id)}
                            className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                            title="Reject"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestsPage;
