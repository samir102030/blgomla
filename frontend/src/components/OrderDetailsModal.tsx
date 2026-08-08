import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import OrderTimeline from "./OrderTimeline";
import { cldImg } from "../lib/cldImage";
import { useMoney } from "../lib/money";

interface TimelineEvent {
  status: string;
  note?: string;
  createdAt: string;
  updatedBy?: { name?: string };
}

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
    collectionName?: string;
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
  statusTimeline?: TimelineEvent[];
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

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const money = useMoney();
  if (!isOpen || !order) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "shipped":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPaymentStatusColor = (isPaid: boolean) => {
    return isPaid
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {t("modal.orderDetails.title")}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t("modal.deleteOrder.orderId", {
                    id: order._id.slice(-8).toUpperCase(),
                  })}
                </p>
              </div>
              <button
                onClick={onClose}
                className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Order Information */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    {t("modal.orderDetails.orderInformation")}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {t("modal.orderDetails.orderIdLabel")}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        #{order._id.slice(-8).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {t("account.date")}:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {t("order.status")}:
                      </span>
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.charAt(0).toUpperCase() +
                          order.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {t("order.paymentMethod")}:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {order.paymentMethod}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {t("modal.orderDetails.paymentStatus")}:
                      </span>
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getPaymentStatusColor(
                          order.isPaid
                        )}`}
                      >
                        {order.isPaid
                          ? t("modal.orderDetails.paid")
                          : t("admin.pending")}
                      </span>
                    </div>
                    {order.store && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          {t("common.store")}:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {order.store.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    {t("modal.orderDetails.customerInformation")}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {t("account.fullName")}:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {order.user.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {t("account.emailAddress")}:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {order.user.email}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                {order.shippingAddress && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      {t("modal.orderDetails.shippingAddress")}
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          {t("account.fullName")}:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {order.shippingAddress.name}
                        </span>
                      </div>
                      {order.shippingAddress.phone && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("account.phoneNumber")}:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {order.shippingAddress.phone}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          {t("Address")}:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {order.shippingAddress.address}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          {t("City") || "City"}:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {order.shippingAddress.city}
                        </span>
                      </div>
                      {order.shippingAddress.state && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("State") || "State"}:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {order.shippingAddress.state}
                          </span>
                        </div>
                      )}
                      {order.shippingAddress.zipCode && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t("ZIP Code") || "ZIP Code"}:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {order.shippingAddress.zipCode}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Order Items & Summary */}
              <div className="space-y-6">
                {/* Order Items */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    {t("Order Items")} ({order.orderItems.length})
                  </h4>
                  <div className="space-y-4 max-h-64 overflow-y-auto">
                    {order.orderItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white p-4 rounded-lg border"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            {item.product?.images &&
                            item.product.images.length > 0 ? (
                              <img
                                src={cldImg(item.product.images?.[0]?.url, { w: 120 })}
                                alt={
                                  item.product.images?.[0]?.alt ||
                                  item.product.name
                                }
                                loading="lazy"
                                decoding="async"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23f3f4f6'/><text x='32' y='38' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%239ca3af'>No image</text></svg>"; }}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                {t("modal.common.noImage")}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-medium text-gray-900">
                                {item.product?.name || t("product.product")}
                              </h5>
                              {item.collectionName && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#FFD600]/30 text-[#333333]">
                                  {item.collectionName}
                                </span>
                              )}
                              {item.salePercentage > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  {t("Sale")} {item.salePercentage}%
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600">
                              {t("Quantity:")} {item.quantity}
                            </p>
                            {item.salePercentage > 0 && (
                              <p className="text-xs text-green-600 font-medium">
                                {t("modal.orderDetails.salePriceEach", {
                                  price: (item.price ?? 0).toFixed(2),
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {money((item.price ?? 0) * (item.quantity ?? 0))}
                          </p>
                          {item.couponDiscount && item.couponDiscount > 0 && (
                            <p className="text-xs text-green-600">
                              {t("modal.orderDetails.couponLine", {
                                amount: (item.couponDiscount ?? 0).toFixed(2),
                              })}
                            </p>
                          )}
                          {item.salePercentage > 0 && (
                            <p className="text-xs text-gray-500 line-through">
                              {money(
                                (item.product?.price ?? 0) *
                                  (item.quantity ?? 0)
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    {t("Order Summary")}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {t("Subtotal")}:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {money(order.itemsPrice ?? order.totalPrice ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {t("Shipping")}:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {money(order.shippingPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t("Tax")}:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {money(order.taxPrice)}
                      </span>
                    </div>
                    {order.couponDiscount && order.couponDiscount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-green-600">
                          {t("modal.orderDetails.couponDiscountWithCode", {
                            code: order.couponCode,
                          })}
                        </span>
                        <span className="text-sm font-medium text-green-600">
                          -{money(order.couponDiscount)}
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-3 flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">
                        {t("Total")}:
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {money(order.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Status Timeline */}
                {order.statusTimeline && order.statusTimeline.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      {t("Order Tracking")}
                    </h4>
                    <OrderTimeline
                      events={order.statusTimeline}
                      currentStatus={order.status}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {t("modal.deleteOrder.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
