import React, { useEffect, useRef, useState } from "react";
import { ArrowPathIcon, CheckCircleIcon, ClockIcon, CubeIcon, InboxIcon, TruckIcon, XCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useOrderStore } from "../stores/order.store";
import { useReturnStore } from "../stores/return.store";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { cldImg } from "../lib/cldImage";

const AccountOrders: React.FC = () => {
  const { t, i18n } = useTranslation();
  const pickName = (p: { name: string; nameAr?: string }) =>
    i18n.language === "ar" && p.nameAr ? p.nameAr : p.name;
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
      await fetchOrderById(orderId);
      const order = useOrderStore.getState().order;
      setSelectedOrder(order);
      if (order) {
        setOrderAddress(order.shippingAddress);
        const products = (order.orderItems || []).map((item: any) => {
          const product = item.product;
          return { ...product, quantity: item.quantity, itemPrice: item.price || product.price, collectionName: item.collectionName };
        });
        setOrderProducts(products);
      }
    } catch (error) { console.error("Error fetching order details:", error); }
    finally { setOrderDetailsLoading(false); }
  };

  /**
   * `?order=<id>` opens that order's details on arrival.
   *
   * What makes a row on the dashboard, or a link somebody was sent, able to
   * land on the order itself rather than on a list to go hunting through.
   *
   * Once per id: the modal can be closed, and reopening it under the
   * customer because the parameter is still in the address bar would make
   * the close button look broken.
   */
  const [searchParams] = useSearchParams();
  const requestedOrder = searchParams.get("order");
  const openedFromUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!requestedOrder || openedFromUrl.current === requestedOrder) return;
    openedFromUrl.current = requestedOrder;
    handleViewOrderDetails(requestedOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedOrder]);

  const handleOpenReturn = (order: any) => { setSelectedReturnOrder(order); setReturnReason(""); setShowReturnModal(true); };
  const handleSubmitReturn = async () => {
    if (!selectedReturnOrder?._id) return;
    const success = await createReturn({ orderId: selectedReturnOrder._id, reason: returnReason.trim() || undefined });
    if (success) setShowReturnModal(false);
  };
  const hasReturnForOrder = (orderId: string) => returns.some((item) => { const rid = typeof item.order === "string" ? item.order : item.order?._id; return rid === orderId; });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered": return "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400";
      case "processing": return "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400";
      case "shipped": return "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400";
      case "cancelled": return "text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400";
      default: return "text-[var(--text-muted)] bg-[var(--surface-2)]";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered": return CheckCircleIcon;
      case "processing": return ArrowPathIcon;
      case "shipped": return TruckIcon;
      case "cancelled": return XCircleIcon;
      default: return ClockIcon;
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all";

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">{t("account.orderHistory", "Order History")}</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">{t("account.orderHistorySubtitle", "View and manage all your past and active orders.")}</p>
      </div>

      {(!orders || orders.length === 0) ? (
        <div className="bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] p-10 text-center">
          <span className="text-4xl"><InboxIcon className="w-9 h-9" aria-hidden="true" /></span>
          <p className="text-sm text-[var(--text-muted)] mt-3">{t("account.noOrders", "No orders yet.")}</p>
          <Link to="/products" className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-[var(--brand-primary)] hover:underline">{t("account.startShopping", "Start Shopping")} →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order._id} className="bg-[var(--surface-2)]/50 border border-[var(--border)] rounded-xl p-4 hover:border-[var(--brand-primary)]/30 transition-all">
              <div className="flex items-center gap-4">
                {(() => { const Icon = getStatusIcon(order.status); return <Icon className="w-6 h-6 shrink-0" aria-hidden="true" />; })()}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[var(--text)]">#{order._id.slice(-8).toUpperCase()}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(order.status)}`}>{order.status}</span>
                  </div>
                  <p className="text-xs text-[var(--text-subtle)] mt-0.5">{order.createdAt?.slice(0, 10)} • {order.orderItems?.length || 0} {t("account.items", "items")}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[var(--text)]">{order.totalPrice?.toLocaleString()} <span className="text-[10px] font-normal text-[var(--text-muted)]">EGP</span></p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border)]">
                <button onClick={() => handleViewOrderDetails(order._id)} className="text-xs font-semibold text-[var(--brand-primary)] hover:underline">{t("account.viewDetails", "View Details")}</button>
                <Link to={`/orders/${order._id}/track`} className="text-xs font-semibold text-[var(--brand-primary)] hover:underline">{t("account.trackOrder", "Track Order")}</Link>
                {order.status === "delivered" && (
                  <button
                    className={`text-xs font-semibold ${hasReturnForOrder(order._id) ? "text-[var(--text-subtle)] cursor-not-allowed" : "text-amber-600 hover:underline"}`}
                    onClick={() => !hasReturnForOrder(order._id) && handleOpenReturn(order)}
                    disabled={hasReturnForOrder(order._id)}
                  >
                    {hasReturnForOrder(order._id) ? t("account.returnRequested", "Return Requested") : t("account.requestReturn", "Request Return")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 lg:p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
            <button className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" onClick={() => setShowOrderModal(false)} aria-label="Close"><XMarkIcon className="w-5 h-5" aria-hidden="true" /></button>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[var(--text)]">{t("account.orderDetails", "Order Details")}</h2>
              <div className="h-1 w-16 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] rounded-full mt-2"></div>
            </div>
            {orderDetailsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--brand-primary)] border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[var(--surface-2)]/50 border border-[var(--border)] rounded-xl p-4">
 <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2"> {t("account.orderInfo", "Order Information")}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">{t("account.orderId", "Order ID")}:</span><span className="font-medium text-[var(--text)]">#{selectedOrder?._id?.slice(-8)?.toUpperCase()}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">{t("account.status", "Status")}:</span><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(selectedOrder?.status || "")}`}>{selectedOrder?.status}</span></div>
                      {selectedOrder?.couponCode ? (
                        <>
                          <div className="flex justify-between"><span className="text-[var(--text-muted)]">{t("account.subtotal", "Subtotal")}:</span><span className="font-medium text-[var(--text)]">{(((selectedOrder?.itemsPrice ?? 0) + (selectedOrder?.shippingPrice ?? 0))).toFixed(2)} EGP</span></div>
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>{t("account.coupon", "Coupon")} ({selectedOrder.couponCode}):</span><span className="font-medium">-{(((selectedOrder?.itemsPrice ?? 0) + (selectedOrder?.shippingPrice ?? 0) - (selectedOrder?.totalPrice ?? 0))).toFixed(2)} EGP</span></div>
                          <div className="flex justify-between border-t border-[var(--border)] pt-2"><span className="font-medium text-[var(--text-muted)]">{t("account.total", "Total")}:</span><span className="font-bold text-[var(--text)]">{selectedOrder?.totalPrice} EGP</span></div>
                        </>
                      ) : (
                        <div className="flex justify-between"><span className="text-[var(--text-muted)]">{t("account.total", "Total")}:</span><span className="font-medium text-[var(--text)]">{selectedOrder?.totalPrice} EGP</span></div>
                      )}
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">{t("account.date", "Date")}:</span><span className="font-medium text-[var(--text)]">{selectedOrder?.createdAt?.slice(0, 10)}</span></div>
                    </div>
                  </div>
                  <div className="bg-[var(--surface-2)]/50 border border-[var(--border)] rounded-xl p-4">
 <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2"> {t("account.shippingPayment", "Shipping & Payment")}</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-[var(--text-muted)]">{t("account.address", "Address")}:</span>
                        {orderAddress ? (
                          <div className="font-medium text-[var(--text)] mt-1 space-y-0.5">
                            <p>{orderAddress.name}</p><p>{orderAddress.address}</p>
                            <p>{orderAddress.city}{orderAddress.state ? `, ${orderAddress.state}` : ""} {orderAddress.zipCode}</p>
                            <p>{orderAddress.country}</p>
 {orderAddress.phone && <p className="text-xs text-[var(--text-subtle)]"> {orderAddress.phone}</p>}
                          </div>
                        ) : <p className="font-medium text-[var(--text)] mt-1">{selectedOrder?.shippingAddress}</p>}
                      </div>
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">{t("account.payment", "Payment")}:</span><span className="font-medium text-[var(--text)]">{selectedOrder?.paymentMethod}</span></div>
                    </div>
                  </div>
                </div>
                <div className="bg-[var(--surface-2)]/50 border border-[var(--border)] rounded-xl p-4">
 <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2"> {t("account.orderItems", "Order Items")}</h3>
                  <div className="space-y-3">
                    {orderProducts.map((product, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)]">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-[var(--surface-2)] rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={cldImg(product.images?.[0]?.url, { w: 120 })}
                                alt={pickName(product)}
                                loading="lazy"
                                decoding="async"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23f3f4f6'/><text x='32' y='38' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%239ca3af'>No image</text></svg>"; }}
                                className="w-full h-full object-cover"
                              />
                            ) : <span className="text-lg text-[var(--text-subtle)]"><CubeIcon className="w-5 h-5" aria-hidden="true" /></span>}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--text)] truncate">
                              {pickName(product)}
                              {product.collectionName && <span className="ml-1.5 text-[10px] text-[var(--text-subtle)]">({product.collectionName})</span>}
                            </p>
                            <p className="text-xs text-[var(--text-subtle)]">{t("account.qty", "Qty")}: {product.quantity}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {product.saleActive && (product.salePercentage ?? 0) > 0 ? (
                            <>
                              <p className="text-xs text-[var(--text-subtle)] line-through">{(product.price ?? 0).toFixed(2)} EGP</p>
                              <p className="text-sm font-medium text-red-500">{(product.itemPrice || product.salePrice || (product.price ?? 0) * (1 - (product.salePercentage ?? 0) / 100)).toFixed(2)} EGP</p>
                              <p className="text-[10px] text-red-400">-{product.salePercentage}%</p>
                            </>
                          ) : <p className="text-sm font-medium text-[var(--text)]">{((product.itemPrice ?? product.price ?? 0)).toFixed(2)} EGP</p>}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 w-full max-w-lg relative">
            <button className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" onClick={() => setShowReturnModal(false)} aria-label="Close"><XMarkIcon className="w-5 h-5" aria-hidden="true" /></button>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-[var(--text)]">{t("account.requestReturn", "Request Return")}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">{t("account.returnOrderId", "Order")} #{selectedReturnOrder?._id?.slice(-8)?.toUpperCase()}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{t("account.returnReason", "Reason (optional)")}</label>
                <textarea rows={4} className={inputClass + " resize-none"} placeholder={t("account.returnReasonPlaceholder", "Tell us why you are returning this order")} value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button className="flex-1 py-3 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-all" onClick={() => setShowReturnModal(false)}>{t("common.cancel", "Cancel")}</button>
                <button className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] hover:shadow-lg transition-all" onClick={handleSubmitReturn}>{t("account.submitRequest", "Submit Request")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountOrders;
