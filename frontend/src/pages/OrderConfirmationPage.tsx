import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useOrderStore } from "../stores/order.store";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface OrderItem {
  product: {
    _id: string;
    name: string;
    price: number;
    images: Array<{ url: string; alt?: string }>;
  };
  quantity: number;
}

interface PopulatedOrder {
  _id: string;
  orderItems: OrderItem[];
  totalPrice: number;
  shippingPrice: number;
  taxPrice: number;
  itemsPrice: number;
  paymentMethod: string;
  status: string;
  createdAt?: string;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
  };
}

const OrderConfirmationPage: React.FC = () => {
  const { t } = useTranslation();
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { fetchOrderById, order: storeOrder } = useOrderStore();

  const order = storeOrder as PopulatedOrder | undefined;

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        toast.error("Order ID is missing");
        navigate("/");
        return;
      }

      try {
        await fetchOrderById(orderId);
        setLoading(false);
      } catch (error: any) {
        console.error("Error loading order:", error);
        toast.error("Failed to load order details");
        navigate("/");
      }
    };

    loadOrder();
  }, [orderId, fetchOrderById, navigate]);

  if (loading && !storeOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-lg text-gray-600">{t("Loading order details...")}</span>
      </div>
    );
  }

  if (!storeOrder) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t("Order Not Found")}
            </h2>
            <p className="text-gray-600 mb-6">
              {t("The order you're looking for doesn't exist.")}
            </p>
            <Link
              to="/"
              className="bg-[#FFD600] text-[#333333] px-6 py-3 rounded-md hover:bg-[#e6c100] font-medium"
            >
              {t("Go Home")}
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <div className="relative bg-green-100 py-16">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop"
            alt="Order Confirmation"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-green-500 rounded-full p-3">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t("Order Confirmed!")}
          </h1>
          <p className="text-lg text-gray-600">
            {t("Thank you for your order!")}
          </p>
        </div>
      </div>

      <main className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Order Details */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <div className="border-b border-gray-200 pb-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t("Order")} #{order!._id.slice(-8).toUpperCase()}
              </h2>
              <p className="text-gray-600">
                {t("Placed on")}{" "}
                {new Date(order!.createdAt || Date.now()).toLocaleDateString()}{" "}
                {t("at")}{" "}
                {new Date(order!.createdAt || Date.now()).toLocaleTimeString()}
              </p>
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {t("Status:")} {order!.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Order Items */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t("Order Items")}
                </h3>
                <div className="space-y-4">
                  {order!.orderItems.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <img
                        src={
                          item.product.images?.[0]?.url || "/placeholder.png"
                        }
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {item.product.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {t("Quantity:")} {item.quantity}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {((item.product.price * item.quantity)).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary & Shipping */}
              <div className="space-y-6">
                {/* Order Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t("Order Summary")}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t("Subtotal")}</span>
                      <span>{(order!.itemsPrice).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("Shipping")}</span>
                      <span>{(order!.shippingPrice).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("Tax")}</span>
                      <span>{(order!.taxPrice).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>{t("Total")}</span>
                        <span>{(order!.totalPrice).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t("Payment Method")}
                  </h3>
                  <p className="text-gray-600 capitalize">
                    {order!.paymentMethod === "cod"
                      ? t("Cash on Delivery")
                      : order!.paymentMethod}
                  </p>
                </div>

                {/* Shipping Address */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t("Shipping Address")}
                  </h3>
                  <div className="text-gray-600">
                    <p className="font-medium">{order!.shippingAddress.name}</p>
                    <p>{order!.shippingAddress.address}</p>
                    <p>
                      {order!.shippingAddress.city},{" "}
                      {order!.shippingAddress.state}{" "}
                      {order!.shippingAddress.zipCode}
                    </p>
                    <p>{order!.shippingAddress.country}</p>
                    <p>Phone: {order!.shippingAddress.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/brands"
              className="bg-[#FFD600] text-[#333333] px-8 py-3 rounded-md hover:bg-[#e6c100] font-medium text-center transition-colors"
            >
              {t("Continue Shopping")}
            </Link>
            <Link
              to="/account?tab=orders"
              className="bg-[#002B5B] text-white px-8 py-3 rounded-md hover:bg-[#e6c100] font-medium text-center transition-colors"
            >
              {t("View My Orders")}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderConfirmationPage;
