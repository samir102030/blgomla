import React, { useEffect, useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { useCouponStore } from "../../stores/coupon.store";
import { useUserStore } from "../../stores/user.store";
import { useVendorStore } from "../../stores/vendor.store";
import AddCouponModal from "../../components/AddCouponModal";
import EditCouponModal from "../../components/EditCouponModal";
import DeleteCouponModal from "../../components/DeleteCouponModal";
import ViewCouponModal from "../../components/ViewCouponModal";

const CouponsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingCoupon, setDeletingCoupon] = useState<any>(null);

  const coupons = useCouponStore((s) => s.coupons);
  const paginated = useCouponStore((s) => s.paginated);
  const loading = useCouponStore((s) => s.loading);
  const error = useCouponStore((s) => s.error);
  const fetchCoupons = useCouponStore((s) => s.fetchCoupons);
  const toggleCouponStatus = useCouponStore((s) => s.toggleCouponStatus);

  const { user } = useUserStore();
  const { vendorStore, fetchVendorStore } = useVendorStore();

  useEffect(() => {
    fetchVendorStore();
  }, [fetchVendorStore]);

  // Fetch coupons when vendor store is loaded
  useEffect(() => {
    if (user?.role === "store" && vendorStore?._id) {
      fetchCoupons({ storeId: vendorStore._id });
    } else if (user?.role === "admin") {
      fetchCoupons();
    }
  }, [user?.role, vendorStore?._id, fetchCoupons]);

  const getStatusColor = (coupon: any) => {
    const now = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);

    if (!coupon.isActive) return "bg-gray-100 text-gray-800";
    if (now < startDate) return "bg-blue-100 text-blue-800";
    if (now > endDate) return "bg-red-100 text-red-800";
    return "bg-green-100 text-green-800";
  };

  const getStatusText = (coupon: any) => {
    const now = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);

    if (!coupon.isActive) return "Inactive";
    if (now < startDate) return "Scheduled";
    if (now > endDate) return "Expired";
    return "Active";
  };

  const filteredCoupons = coupons.filter((coupon) => {
    const matchesSearch =
      coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (coupon.description || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleViewCoupon = (coupon: any) => {
    setSelectedCoupon(coupon);
    setIsViewingDetails(true);
  };

  const handleEditCoupon = (coupon: any) => {
    setEditingCoupon(coupon);
    setIsEditing(true);
  };

  const handleDeleteCoupon = (coupon: any) => {
    setDeletingCoupon(coupon);
    setIsDeleting(true);
  };

  const handleToggleStatus = async (couponId: string) => {
    await toggleCouponStatus(couponId);
    // Refresh coupons
    if (user?.role === "store" && vendorStore?._id) {
      fetchCoupons({ storeId: vendorStore._id });
    } else if (user?.role === "admin") {
      fetchCoupons();
    }
  };

  const refreshCoupons = () => {
    if (user?.role === "store" && vendorStore?._id) {
      fetchCoupons({ storeId: vendorStore._id });
    } else if (user?.role === "admin") {
      fetchCoupons();
    }
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-sm text-gray-500">Loading coupons...</div>
      )}
      {error && <div className="text-sm text-red-500">Error: {error}</div>}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">
            Coupon Management
          </h1>
          <p className="text-[#9E9E9E]">
            Create and manage discount coupons for your store
          </p>
        </div>
        <div>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg hover:bg-[#e6c100] transition-colors flex items-center gap-2 font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            Create Coupon
          </button>
        </div>
      </div>

      {isCreating && (
        <AddCouponModal
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          onCouponCreated={refreshCoupons}
        />
      )}

      {isEditing && editingCoupon && (
        <EditCouponModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          onCouponUpdated={refreshCoupons}
          coupon={editingCoupon}
        />
      )}

      {isDeleting && deletingCoupon && (
        <DeleteCouponModal
          isOpen={isDeleting}
          onClose={() => setIsDeleting(false)}
          onCouponDeleted={refreshCoupons}
          coupon={deletingCoupon}
        />
      )}

      {isViewingDetails && selectedCoupon && (
        <ViewCouponModal
          isOpen={isViewingDetails}
          onClose={() => setIsViewingDetails(false)}
          coupon={selectedCoupon}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Coupons</p>
              <p className="text-2xl font-bold text-gray-900">
                {paginated?.total ?? coupons.length}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <TagIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Coupons</p>
              <p className="text-2xl font-bold text-green-600">
                {
                  coupons.filter((c) => {
                    const now = new Date();
                    return (
                      c.isActive &&
                      now >= new Date(c.startDate) &&
                      now <= new Date(c.endDate)
                    );
                  }).length
                }
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired Coupons</p>
              <p className="text-2xl font-bold text-red-600">
                {coupons.filter((c) => new Date() > new Date(c.endDate)).length}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <span className="text-2xl">⏰</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Usage</p>
              <p className="text-2xl font-bold text-purple-600">
                {coupons.reduce((acc, c) => acc + (c.usageCount || 0), 0)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search coupons by code or description..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Validity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCoupons.map((coupon) => (
                <tr key={coupon._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {coupon.code}
                    </div>
                    {coupon.description && (
                      <div className="text-sm text-gray-500">
                        {coupon.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="font-medium">
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}%`
                        : `$${coupon.discountValue}`}
                    </div>
                    {coupon.minimumPurchase && (
                      <div className="text-xs text-gray-500">
                        Min: ${coupon.minimumPurchase}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{new Date(coupon.startDate).toLocaleDateString()}</div>
                    <div className="text-gray-500">
                      to {new Date(coupon.endDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{coupon.usageCount || 0}</div>
                    {coupon.usageLimit && (
                      <div className="text-gray-500">/ {coupon.usageLimit}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        coupon
                      )}`}
                    >
                      {getStatusText(coupon)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewCoupon(coupon)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditCoupon(coupon)}
                        className="text-green-600 hover:text-green-900"
                        title="Edit Coupon"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(coupon._id)}
                        className={`${
                          coupon.isActive
                            ? "text-yellow-600 hover:text-yellow-900"
                            : "text-green-600 hover:text-green-900"
                        }`}
                        title={coupon.isActive ? "Deactivate" : "Activate"}
                      >
                        {coupon.isActive ? "⏸️" : "▶️"}
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(coupon)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Coupon"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredCoupons.length === 0 && !loading && (
        <div className="text-center py-12">
          <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No coupons</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first coupon.
          </p>
        </div>
      )}
    </div>
  );
};

export default CouponsPage;
