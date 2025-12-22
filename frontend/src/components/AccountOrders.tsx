import React, { useState } from "react";
import { useOrderStore } from "../stores/order.store";
import { useReturnStore } from "../stores/return.store";

const AccountOrders: React.FC = () => {
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderAddress, setOrderAddress] = useState<any>(null);
  const [orderProducts, setOrderProducts] = useState<any[]>([]);

  const fetchOrderById = useOrderStore((state) => state.fetchOrderById);
  const orders = useOrderStore((state) => state.orders);
  const returns = useReturnStore((state) => state.returns);
  const createReturn = useReturnStore((state) => state.createReturn);

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [selectedReturnOrder, setSelectedReturnOrder] = useState<any>(null);

  const handleViewOrderDetails = async (orderId: string) => {
    setShowOrderModal(true);
    setOrderDetailsLoading(true);
    setOrderAddress(null);
    setOrderProducts([]);

    try {
      // Fetch order details (now includes populated address and products)
      await fetchOrderById(orderId);
      const order = useOrderStore.getState().order;
      setSelectedOrder(order);

      if (order) {
        // Set address (now populated)
        setOrderAddress(order.shippingAddress);

        // Set products (now populated with full product details)
        const products = (order.orderItems || []).map((item: any) => {
          const product = item.product;
          return {
            ...product,
            quantity: item.quantity,
            itemPrice: item.price || product.price,
          };
        });
        setOrderProducts(products);
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  const handleOpenReturn = (order: any) => {
    setSelectedReturnOrder(order);
    setReturnReason("");
    setShowReturnModal(true);
  };

  const handleSubmitReturn = async () => {
    if (!selectedReturnOrder?._id) return;
    const success = await createReturn({
      orderId: selectedReturnOrder._id,
      reason: returnReason.trim() || undefined,
    });
    if (success) {
      setShowReturnModal(false);
    }
  };

  const hasReturnForOrder = (orderId: string) => {
    return returns.some((item) => {
      const returnOrderId =
        typeof item.order === "string" ? item.order : item.order?._id;
      return returnOrderId === orderId;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "text-[#009688] bg-[#009688]/10";
      case "processing":
        return "text-[#333333] bg-[#FFD600]/10";
      case "shipped":
        return "text-[#002B5B] bg-[#002B5B]/10";
      default:
        return "text-[#9E9E9E] bg-[#9E9E9E]/10";
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Order History</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                Date
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                Total
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order._id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {order._id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {order.createdAt?.slice(0, 10)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  ${order.totalPrice}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col items-start gap-2">
                    <button
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      onClick={() => handleViewOrderDetails(order._id)}
                    >
                      View Details
                    </button>
                    {order.status === "delivered" && (
                      <button
                        className={`text-sm font-medium ${
                          hasReturnForOrder(order._id)
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-[#002B5B] hover:text-[#001a3d]"
                        }`}
                        onClick={() =>
                          !hasReturnForOrder(order._id) &&
                          handleOpenReturn(order)
                        }
                        disabled={hasReturnForOrder(order._id)}
                      >
                        {hasReturnForOrder(order._id)
                          ? "Return Requested"
                          : "Request Return"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setShowOrderModal(false)}
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Order Details
              </h2>
              <div className="h-1 w-20 bg-[#FFD600] rounded-full"></div>
            </div>
            {orderDetailsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD600]"></div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-[#002B5B]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Order Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Order ID:</span>
                        <span className="font-medium text-gray-900">
                          {selectedOrder?._id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            selectedOrder?.status || ""
                          )}`}
                        >
                          {selectedOrder?.status}
                        </span>
                      </div>
                      {selectedOrder?.couponCode ? (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium text-gray-900">
                              $
                              {(
                                selectedOrder?.itemsPrice +
                                (selectedOrder?.shippingPrice || 0)
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Coupon ({selectedOrder.couponCode}):</span>
                            <span className="font-medium">
                              -$
                              {(
                                selectedOrder?.itemsPrice +
                                (selectedOrder?.shippingPrice || 0) -
                                selectedOrder?.totalPrice
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-gray-600 font-medium">
                              Total:
                            </span>
                            <span className="font-bold text-gray-900">
                              ${selectedOrder?.totalPrice}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-medium text-gray-900">
                            ${selectedOrder?.totalPrice}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium text-gray-900">
                          {selectedOrder?.createdAt?.slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-[#002B5B]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Shipping & Payment
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Address:</span>
                        {orderAddress ? (
                          <div className="font-medium text-gray-900 mt-1">
                            <p>{orderAddress.name}</p>
                            <p>{orderAddress.address}</p>
                            <p>
                              {orderAddress.city}
                              {orderAddress.state
                                ? `, ${orderAddress.state}`
                                : ""}{" "}
                              {orderAddress.zipCode}
                            </p>
                            <p>{orderAddress.country}</p>
                            {orderAddress.phone && (
                              <p>Phone: {orderAddress.phone}</p>
                            )}
                          </div>
                        ) : (
                          <p className="font-medium text-gray-900 mt-1">
                            {selectedOrder?.shippingAddress}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment:</span>
                        <span className="font-medium text-gray-900">
                          {selectedOrder?.paymentMethod}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-[#002B5B]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                    Order Items
                  </h3>
                  <div className="space-y-3">
                    {orderProducts.map((product, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white rounded-lg p-3 border"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={product.images[0].url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <svg
                                className="w-6 h-6 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {product.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              Quantity: {product.quantity}
                            </p>
                            {product.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {product.saleActive && product.salePercentage > 0 ? (
                            <div>
                              <p className="text-sm text-gray-500 line-through">
                                ${product.price.toFixed(2)}
                              </p>
                              <p className="font-medium text-red-600">
                                $
                                {(
                                  product.itemPrice ||
                                  product.salePrice ||
                                  product.price *
                                    (1 - product.salePercentage / 100)
                                ).toFixed(2)}
                              </p>
                              <p className="text-xs text-red-500">
                                {product.salePercentage}% off
                              </p>
                            </div>
                          ) : (
                            <p className="font-medium text-gray-900">
                              ${(product.itemPrice || product.price).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setShowReturnModal(false)}
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Request Return
              </h2>
              <p className="text-sm text-gray-600">
                Order #{selectedReturnOrder?._id}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#FFD600] focus:border-transparent"
                  placeholder="Tell us why you are returning this order"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowReturnModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm rounded-lg bg-[#002B5B] text-white hover:bg-[#001a3d]"
                  onClick={handleSubmitReturn}
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountOrders;
