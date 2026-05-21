import React from "react";
import { useUserStore } from "../stores/user.store";
import { useOrderStore } from "../stores/order.store";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import ReferralCard from "./ReferralCard";

const AccountDashboard: React.FC = () => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const orders = useOrderStore((state) => state.orders);

  const totalSpent = orders?.reduce((sum, order) => sum + (order?.totalPrice || 0), 0) || 0;
  const deliveredOrders = orders?.filter(o => o.status?.toLowerCase() === "delivered").length || 0;
  const pendingOrders = orders?.filter(o => ["processing", "shipped", "pending"].includes(o.status?.toLowerCase())).length || 0;

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
      case "delivered": return "✅";
      case "processing": return "⏳";
      case "shipped": return "🚚";
      case "cancelled": return "❌";
      default: return "📋";
    }
  };

  const stats = [
    { label: t("account.totalOrders", "Total Orders"), value: orders?.length || 0, icon: "📦", color: "from-blue-500/10 to-indigo-500/5 border-blue-500/15" },
    { label: t("account.totalSpent", "Total Spent"), value: `${totalSpent.toLocaleString()} EGP`, icon: "💰", color: "from-emerald-500/10 to-green-500/5 border-emerald-500/15" },
    { label: t("account.delivered", "Delivered"), value: deliveredOrders, icon: "✅", color: "from-violet-500/10 to-purple-500/5 border-violet-500/15" },
    { label: t("account.wishlistItems", "Wishlist"), value: user?.love?.length || 0, icon: "❤️", color: "from-rose-500/10 to-pink-500/5 border-rose-500/15" },
    { label: t("account.loyaltyPoints", "Loyalty Points"), value: user?.loyaltyPoints || 0, icon: "⭐", color: "from-amber-500/10 to-yellow-500/5 border-amber-500/15" },
  ];

  const quickActions = [
    { label: t("account.browseProducts", "Browse Products"), icon: "🛍️", to: "/products" },
    { label: t("account.viewWishlist", "View Wishlist"), icon: "❤️", to: "/wishlist" },
    { label: t("account.trackOrders", "Track Orders"), icon: "📦", to: "#", onClick: () => {} },
    { label: t("account.getSupport", "Get Support"), icon: "💬", to: "/contact" },
  ];

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">{t("account.welcomeBack", "Welcome back")}, {user?.name?.split(" ")[0]}! 👋</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">{t("account.dashboardDesc", "Here's an overview of your account activity.")}</p>
      </div>

      {/* ===== STAT CARDS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-gradient-to-br ${stat.color} border rounded-2xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5`}>
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-xl lg:text-2xl font-bold text-[var(--text)]">{stat.value}</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ===== REFERRAL CARD ===== */}
      <ReferralCard />

      {/* ===== ACTIVE ORDERS ALERT ===== */}
      {pendingOrders > 0 && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 mb-6">
          <span className="text-2xl">📦</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t("account.activeOrders", "You have {{count}} active order(s)", { count: pendingOrders })}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400/70">{t("account.activeOrdersDesc", "Check the orders tab for tracking and details.")}</p>
          </div>
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300 shrink-0">⟶</span>
        </div>
      )}

      {/* ===== RECENT ORDERS ===== */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--text)]">{t("account.recentOrders", "Recent Orders")}</h3>
          {orders && orders.length > 3 && <span className="text-xs font-medium text-[var(--brand-primary)] cursor-pointer hover:underline">{t("account.viewAll", "View All")} →</span>}
        </div>

        {(!orders || orders.length === 0) ? (
          <div className="bg-[var(--surface-2)] rounded-2xl p-8 text-center border border-[var(--border)]">
            <span className="text-4xl">📭</span>
            <p className="text-sm text-[var(--text-muted)] mt-3">{t("account.noOrders", "No orders yet. Start shopping to see your orders here!")}</p>
            <Link to="/products" className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-[var(--brand-primary)] hover:underline">{t("account.startShopping", "Start Shopping")} →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 3).map((order) => (
              <div key={order._id} className="bg-[var(--surface-2)]/50 border border-[var(--border)] rounded-xl p-4 flex items-center gap-4 hover:border-[var(--brand-primary)]/30 transition-all group">
                <div className="text-2xl shrink-0">{getStatusIcon(order.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[var(--text)] truncate">#{order._id.slice(-8).toUpperCase()}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(order.status)}`}>{order.status}</span>
                  </div>
                  <p className="text-xs text-[var(--text-subtle)] mt-0.5">{order.createdAt?.slice(0, 10)} • {order.orderItems?.length || 0} {t("account.items", "items")}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[var(--text)]">{order.totalPrice?.toLocaleString()} <span className="text-[10px] font-normal text-[var(--text-muted)]">EGP</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== QUICK ACTIONS ===== */}
      <div>
        <h3 className="text-base font-semibold text-[var(--text)] mb-4">{t("account.quickActions", "Quick Actions")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action, i) => (
            <Link key={i} to={action.to} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 text-center hover:border-[var(--brand-primary)]/30 hover:shadow-sm hover:-translate-y-0.5 transition-all group">
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{action.icon}</div>
              <div className="text-xs font-medium text-[var(--text)]">{action.label}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountDashboard;
