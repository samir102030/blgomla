import React, { useState, useEffect, useCallback } from "react";
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002B5B] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Error loading orders</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchOrders}
            className="mt-4 bg-[#002B5B] text-white px-4 py-2 rounded-lg hover:bg-[#001a3d] transition-colors"
          >
            Try Again
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
            {user?.role === "store" ? "My Store Orders" : "Orders Management"}
          </h1>
          <p className="text-[#9E9E9E]">
            {user?.role === "store"
              ? "Manage orders for your store"
              : "Manage and track all customer orders"}
          </p>
        </div>
        {user?.role === "admin" && (
          <button className="bg-[#002B5B] text-white px-4 py-2 rounded-lg hover:bg-[#001a3d] transition-colors">
            Export Orders
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#FAFAFA] p-6 rounded-lg shadow-sm border border-[#9E9E9E]/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#9E9E9E]">Total Revenue</p>
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
              <p className="text-sm text-[#9E9E9E]">Pending Orders</p>
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
              <p className="text-sm text-gray-600">Completed Orders</p>
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
              <p className="text-sm text-gray-600">Filtered Results</p>
              <p className="text-2xl font-bold text-purple-600">
                {filteredOrders.length}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
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
                placeholder={
                  user?.role === "admin"
                    ? "Search orders by customer, order ID, email, or store name..."
                    : user?.role === "store"
                    ? "Search orders by customer, order ID, or email..."
                    : "Search orders by order ID or email..."
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
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
              More Filters
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
                  Order ID
                </th>
                {user?.role === "admin" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
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
                        order.status
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
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="View Order Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                        title="Edit Order Status"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {/* Show delete button only for pending/cancelled orders */}
                      {["pending", "cancelled"].includes(order.status) && (
                        <button
                          onClick={() => handleDeleteOrder(order)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete Order"
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
          <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
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
