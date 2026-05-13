import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useUserStore } from "../../stores/user.store";
import { axiosInstance } from "../../lib/axios";
import OrderDetailsModal from "../../components/OrderDetailsModal";
import EditOrderModal from "../../components/EditOrderModal";
import DeleteOrderModal from "../../components/DeleteOrderModal";
import OrderFiltersModal from "../../components/OrderFiltersModal";

interface Order {
  _id: string;
  user: {
    name: string;
    email: string;
  };
  store?: {
    name: string;
  };
  orderItems: Array<{
    product: {
      _id: string;
      name: string;
      price: number;
      images: Array<{
        url: string;
        alt?: string;
      }>;
      saleActive: boolean;
      salePercentage: number;
    };
    quantity: number;
    price: number;
    salePercentage: number;
    couponDiscount?: number;
  }>;
  totalPrice: number;
  itemsPrice: number;
  shippingPrice: number;
  taxPrice: number;
  couponCode?: string;
  couponDiscount?: number;
  discountPrice?: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  isPaid: boolean;
  isDelivered: boolean;
  shippingAddress?: {
    name: string;
    phone?: string;
    address: string;
    city: string;
    state?: string;
    zipCode?: string;
  };
}

const OrdersPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useUserStore((state) => state.user);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<{
    status: string[];
    paymentMethod: string[];
    dateRange: { start: string; end: string };
    minAmount: string;
    maxAmount: string;
  }>({
    status: [],
    paymentMethod: [],
    dateRange: { start: "", end: "" },
    minAmount: "",
    maxAmount: "",
  });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (user?.role === "admin") {
        // Admin gets all orders with store information
        response = await axiosInstance.get("/orders");
      } else if (user?.role === "store") {
        // Store gets only their orders
        response = await axiosInstance.get("/orders");
      }

      if (response?.data?.success) {
        setOrders(response.data.orders);
      } else {
        setError("Failed to fetch orders");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-[#009688]/10 text-[#009688]";
      case "pending":
        return "bg-[#FFD600]/10 text-[#333333]";
      case "processing":
        return "bg-[#002B5B]/10 text-[#002B5B]";
      case "shipped":
        return "bg-[#673AB7]/10 text-[#673AB7]";
      case "cancelled":
        return "bg-[#D32F2F]/10 text-[#D32F2F]";
      default:
        return "bg-[#9E9E9E]/10 text-[#9E9E9E]";
    }
  };

  // Modal handlers
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  const handleDeleteOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDeleteModalOpen(true);
  };

  const handleOpenFilters = () => {
    setIsFiltersModalOpen(true);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await axiosInstance.put(`/orders/${orderId}/status`, { status });
      // Refresh orders after update
      fetchOrders();
    } catch (error) {
      console.error("Failed to update order status:", error);
    }
  };

  const handleDeleteOrderConfirm = async (orderId: string) => {
    try {
      await axiosInstance.delete(`/orders/${orderId}`);
      // Refresh orders after deletion
      fetchOrders();
    } catch (error) {
      console.error("Failed to delete order:", error);
    }
  };

  const handleApplyFilters = (filters: {
    status: string[];
    paymentMethod: string[];
    dateRange: { start: string; end: string };
    minAmount: string;
    maxAmount: string;
  }) => {
    setAdvancedFilters(filters);
    // Apply filters to the orders list
    // This would need to be implemented based on your filtering logic
  };

  const filteredOrders = orders.filter((order) => {
    // Basic search filter
    const matchesSearch =
      order.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user?.role === "admin" &&
        order.store?.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Basic status filter
    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    // Advanced filters
    const matchesAdvancedStatus =
      advancedFilters.status.length === 0 ||
      advancedFilters.status.includes(order.status);

    const matchesPaymentMethod =
      advancedFilters.paymentMethod.length === 0 ||
      advancedFilters.paymentMethod.includes(order.paymentMethod);

    const orderDate = new Date(order.createdAt);
    const matchesDateRange =
      (!advancedFilters.dateRange.start ||
        orderDate >= new Date(advancedFilters.dateRange.start)) &&
      (!advancedFilters.dateRange.end ||
        orderDate <= new Date(advancedFilters.dateRange.end + "T23:59:59"));

    const matchesAmountRange =
      (!advancedFilters.minAmount ||
        order.totalPrice >= parseFloat(advancedFilters.minAmount)) &&
      (!advancedFilters.maxAmount ||
        order.totalPrice <= parseFloat(advancedFilters.maxAmount));

    return (
      matchesSearch &&
      matchesStatus &&
      matchesAdvancedStatus &&
      matchesPaymentMethod &&
      matchesDateRange &&
      matchesAmountRange
    );
  });

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002B5B] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t("order.loadingOrders")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">
            {t("order.errorLoadingOrders")}
          </div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchOrders}
            className="mt-4 bg-[#002B5B] text-white px-4 py-2 rounded-lg hover:bg-[#001a3d] transition-colors"
          >
            {t("order.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">
            {user?.role === "store"
              ? t("order.myStoreOrders")
              : t("order.ordersManagement")}
          </h1>
          <p className="text-[#9E9E9E]">
            {user?.role === "store"
              ? t("order.manageOrdersStore")
              : t("order.manageAllOrders")}
          </p>
        </div>
        {user?.role === "admin" && (
          <button className="bg-[#002B5B] text-white px-4 py-2 rounded-lg hover:bg-[#001a3d] transition-colors">
            {t("order.exportOrders")}
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#FAFAFA] p-6 rounded-lg shadow-sm border border-[#9E9E9E]/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#9E9E9E]">
                {t("order.totalRevenue")}
              </p>
              <p className="text-2xl font-bold text-[#333333]">
                $
                {filteredOrders
                  .reduce((total, order) => total + order.totalPrice, 0)
                  .toFixed(2)}
              </p>
            </div>
            <div className="bg-[#002B5B]/10 p-3 rounded-full">
              <span className="text-2xl">�</span>
            </div>
          </div>
        </div>
        <div className="bg-[#FAFAFA] p-6 rounded-lg shadow-sm border border-[#9E9E9E]/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#9E9E9E]">
                {t("order.pendingOrders")}
              </p>
              <p className="text-2xl font-bold text-[#FFD600]">
                {
                  filteredOrders.filter((order) => order.status === "pending")
                    .length
                }
              </p>
            </div>
            <div className="bg-[#FFD600]/10 p-3 rounded-full">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("order.completedOrders")}
              </p>
              <p className="text-2xl font-bold text-green-600">
                {
                  filteredOrders.filter((order) => order.status === "delivered")
                    .length
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
              <p className="text-sm text-gray-600">
                {t("order.filteredResults")}
              </p>
              <p className="text-2xl font-bold text-[var(--brand-primary)]">
                {filteredOrders.length}
              </p>
            </div>
            <div className="bg-[var(--brand-primary)]/10 p-3 rounded-full">
              <span className="text-2xl">�</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t("order.searchPlaceholder")}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t("order.allStatuses")}</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={handleOpenFilters}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4" />
              {t("order.advancedFilters")}
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("order.orderNumber")}
                </th>
                {user?.role === "admin" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("common.store")}
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("order.customer")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("order.date")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("order.status")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("common.items")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("common.total")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("order.paymentMethod")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--brand-primary)]">
                    #{order._id.slice(-8).toUpperCase()}
                  </td>
                  {user?.role === "admin" && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.store?.name || "N/A"}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {order.user.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        order.status,
                      )}`}
                    >
                      {order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.orderItems.length} items
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${order.totalPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.paymentMethod}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="text-[var(--brand-primary)] hover:text-[var(--brand-accent)] p-1 rounded hover:bg-[var(--brand-primary)]/10 transition-colors"
                        title={t("order.view")}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                        title={t("order.edit")}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {/* Show delete button only for pending/cancelled orders */}
                      {["pending", "cancelled"].includes(order.status) && (
                        <button
                          onClick={() => handleDeleteOrder(order)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          title={t("order.delete")}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="bg-white px-6 py-3 rounded-lg shadow-sm border flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">1</span> to{" "}
          <span className="font-medium">{filteredOrders.length}</span> of{" "}
          <span className="font-medium">{filteredOrders.length}</span> results
        </div>
        <div className="flex space-x-2">
          <button
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
            disabled
          >
            Previous
          </button>
          <button className="px-3 py-1 bg-[var(--brand-accent)] text-white rounded text-sm">
            1
          </button>
          <button
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
            disabled
          >
            Next
          </button>
        </div>
      </div>

      {/* Modals */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />

      <EditOrderModal
        order={selectedOrder}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleUpdateOrderStatus}
      />

      <DeleteOrderModal
        order={selectedOrder}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteOrderConfirm}
      />

      <OrderFiltersModal
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={advancedFilters}
      />
    </div>
  );
};

export default OrdersPage;
