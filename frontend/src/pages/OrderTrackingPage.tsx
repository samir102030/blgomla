import React, { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import OrderTimeline from "../components/OrderTimeline";
import { useOrderStore } from "../stores/order.store";
import { useUserStore } from "../stores/user.store";
import { cldImg } from "../lib/cldImage";

interface TrackedAddress {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
}

interface TrackedItem {
  product?: {
    _id?: string;
    name?: string;
    price?: number;
    images?: Array<{ url?: string }>;
  };
  quantity?: number;
  price?: number;
  collectionName?: string;
}

interface TrackedOrder {
  _id: string;
  status: string;
  createdAt?: string;
  orderItems?: TrackedItem[];
  shippingAddress?: TrackedAddress | string;
  paymentMethod?: string;
  itemsPrice?: number;
  shippingPrice?: number;
  taxPrice?: number;
  totalPrice?: number;
  isPaid?: boolean;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  shipment?: { provider?: string; code?: string; status?: string };
  statusTimeline?: Array<{
    status: string;
    note?: string;
    createdAt: string;
    updatedBy?: { name?: string };
  }>;
}

// Forward fulfilment flow shown in the stepper (cancelled is handled separately).
const STEPS = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
] as const;

const STEP_ICON: Record<string, string> = {
 pending: "",
 confirmed: "",
 processing: "",
 shipped: "",
 out_for_delivery: "",
 delivered: "",
};

const OrderTrackingPage: React.FC = () => {
  const { t } = useTranslation();
  const { orderId } = useParams<{ orderId: string }>();
  const user = useUserStore((s) => s.user);
  const fetchOrderById = useOrderStore((s) => s.fetchOrderById);
  const order = useOrderStore((s) => s.order) as TrackedOrder | undefined;
  const loading = useOrderStore((s) => s.loading);
  const error = useOrderStore((s) => s.error);

  useEffect(() => {
    if (orderId) fetchOrderById(orderId);
  }, [orderId, fetchOrderById]);

  const stepLabel: Record<string, string> = {
    pending: t("tracking.placed", "Order Placed"),
    confirmed: t("tracking.confirmed", "Confirmed"),
    processing: t("tracking.processing", "Processing"),
    shipped: t("tracking.shipped", "Shipped"),
    out_for_delivery: t("tracking.outForDelivery", "Out for Delivery"),
    delivered: t("tracking.delivered", "Delivered"),
  };

  const showThisOrder = order && order._id === orderId;
  const isCancelled = order?.status === "cancelled";
  const currentIdx = order ? STEPS.indexOf(order.status as (typeof STEPS)[number]) : -1;

  const fmtDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";

  const addr =
    order && typeof order.shippingAddress === "object"
      ? (order.shippingAddress as TrackedAddress)
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!user ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-10 text-center">
 <span className="text-4xl"></span>
            <p className="text-sm text-[var(--text-muted)] mt-3">
              {t("tracking.signInPrompt", "Please sign in to track your order.")}
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:opacity-90 transition-opacity"
            >
              {t("common.signIn", "Sign In")}
            </Link>
          </div>
        ) : loading && !showThisOrder ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--brand-primary)] border-t-transparent" />
          </div>
        ) : !showThisOrder ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-10 text-center">
 <span className="text-4xl"></span>
            <p className="text-sm text-[var(--text-muted)] mt-3">
              {error ||
                t(
                  "tracking.notFound",
                  "We couldn't find this order, or you don't have access to it."
                )}
            </p>
            <Link
              to="/account"
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-[var(--brand-primary)] hover:underline"
            >
              {t("tracking.backToOrders", "Back to My Orders")} →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Heading */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link
                  to="/account"
                  className="text-xs font-medium text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors"
                >
                  ← {t("tracking.backToOrders", "Back to My Orders")}
                </Link>
                <h1 className="text-2xl font-bold text-[var(--text)] mt-1">
                  {t("tracking.title", "Track Order")} #
                  {order._id.slice(-8).toUpperCase()}
                </h1>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                  {t("tracking.placedOn", "Placed on")} {fmtDate(order.createdAt)}
                </p>
              </div>
            </div>

            {/* Stepper / cancelled banner */}
            {isCancelled ? (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl p-5 flex items-center gap-3">
 <span className="text-2xl"></span>
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-400">
                    {t("tracking.cancelledTitle", "This order was cancelled")}
                  </p>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80">
                    {t(
                      "tracking.cancelledBody",
                      "See the timeline below for details."
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6">
                <div className="flex items-start justify-between gap-1 overflow-x-auto">
                  {STEPS.map((step, i) => {
                    const done = currentIdx >= 0 && i <= currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <React.Fragment key={step}>
                        <div className="flex flex-col items-center text-center min-w-[58px] flex-1">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-base transition-colors ${
                              done
                                ? "bg-[var(--brand-primary)] text-white"
                                : "bg-[var(--surface-2)] text-[var(--text-subtle)]"
                            } ${
                              isCurrent
                                ? "ring-2 ring-offset-2 ring-offset-[var(--surface)] ring-[var(--brand-primary)]"
                                : ""
                            }`}
                          >
                            {STEP_ICON[step]}
                          </div>
                          <span
                            className={`text-[11px] mt-1.5 leading-tight ${
                              done
                                ? "text-[var(--text)] font-medium"
                                : "text-[var(--text-subtle)]"
                            }`}
                          >
                            {stepLabel[step]}
                          </span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div
                            className={`h-0.5 flex-1 mt-5 min-w-[12px] ${
                              currentIdx > i
                                ? "bg-[var(--brand-primary)]"
                                : "bg-[var(--border)]"
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Shipment / tracking details */}
            {(order.trackingNumber ||
              order.trackingUrl ||
              order.estimatedDelivery ||
              order.shipment?.provider) && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
 {t("tracking.shipmentInfo", "Shipment Information")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {order.shipment?.provider && (
                    <div className="flex justify-between sm:block">
                      <span className="text-[var(--text-muted)]">
                        {t("tracking.carrier", "Carrier")}
                      </span>
                      <span className="font-medium text-[var(--text)] sm:block">
                        {order.shipment.provider}
                      </span>
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div className="flex justify-between sm:block">
                      <span className="text-[var(--text-muted)]">
                        {t("tracking.trackingNumber", "Tracking Number")}
                      </span>
                      <span className="font-medium text-[var(--text)] sm:block break-all">
                        {order.trackingNumber}
                      </span>
                    </div>
                  )}
                  {order.estimatedDelivery && (
                    <div className="flex justify-between sm:block">
                      <span className="text-[var(--text-muted)]">
                        {t("tracking.estimatedDelivery", "Estimated Delivery")}
                      </span>
                      <span className="font-medium text-[var(--text)] sm:block">
                        {fmtDate(order.estimatedDelivery)}
                      </span>
                    </div>
                  )}
                </div>
                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:opacity-90 transition-opacity"
                  >
                    {t("tracking.trackWithCarrier", "Track with carrier")} ↗
                  </a>
                )}
              </div>
            )}

            {/* Timeline */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
 {t("tracking.history", "Tracking History")}
              </h2>
              <OrderTimeline
                events={order.statusTimeline || []}
                currentStatus={order.status}
              />
            </div>

            {/* Items */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
 {t("tracking.items", "Items")} ({order.orderItems?.length || 0})
              </h2>
              <div className="space-y-3">
                {(order.orderItems || []).map((item, idx) => {
                  const p = item.product || {};
                  return (
                    <div
                      key={p._id || idx}
                      className="flex items-center gap-3 bg-[var(--surface-2)]/50 rounded-xl p-3 border border-[var(--border)]"
                    >
                      <div className="w-12 h-12 bg-[var(--surface-2)] rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                        {p.images?.[0]?.url ? (
                          <img
                            src={cldImg(p.images[0].url, { w: 120 })}
                            alt={p.name || ""}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        ) : (
 <span className="text-lg text-[var(--text-subtle)]"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text)] truncate">
                          {p.name}
                          {item.collectionName && (
                            <span className="ml-1.5 text-[10px] text-[var(--text-subtle)]">
                              ({item.collectionName})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[var(--text-subtle)]">
                          {t("tracking.qty", "Qty")}: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-[var(--text)] shrink-0">
                        {((item.price ?? p.price ?? 0)).toLocaleString()} EGP
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Address + summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
 {t("tracking.deliveryAddress", "Delivery Address")}
                </h2>
                {addr ? (
                  <div className="text-sm text-[var(--text)] space-y-0.5">
                    <p className="font-medium">{addr.name}</p>
                    <p>{addr.address}</p>
                    <p>
                      {addr.city}
                      {addr.state ? `, ${addr.state}` : ""} {addr.zipCode}
                    </p>
                    {addr.country && <p>{addr.country}</p>}
                    {addr.phone && (
 <p className="text-xs text-[var(--text-subtle)]"> {addr.phone}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">—</p>
                )}
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
 {t("tracking.summary", "Order Summary")}
                </h2>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">
                      {t("tracking.subtotal", "Subtotal")}
                    </span>
                    <span className="text-[var(--text)]">
                      {(order.itemsPrice ?? 0).toLocaleString()} EGP
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">
                      {t("tracking.shipping", "Shipping")}
                    </span>
                    <span className="text-[var(--text)]">
                      {(order.shippingPrice ?? 0).toLocaleString()} EGP
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--border)] pt-2 mt-1">
                    <span className="font-semibold text-[var(--text)]">
                      {t("tracking.total", "Total")}
                    </span>
                    <span className="font-bold text-[var(--text)]">
                      {(order.totalPrice ?? 0).toLocaleString()} EGP
                    </span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-[var(--text-muted)]">
                      {t("tracking.payment", "Payment")}
                    </span>
                    <span className="text-[var(--text)] uppercase text-xs font-medium">
                      {order.paymentMethod}
                      {order.isPaid
                        ? ` · ${t("tracking.paid", "Paid")}`
                        : ` · ${t("tracking.unpaid", "Unpaid")}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default OrderTrackingPage;
