import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AccountDashboard from "../components/AccountDashboard";
import AccountOrders from "../components/AccountOrders";
import AccountReturns from "../components/AccountReturns";
import AccountAddresses from "../components/AccountAddresses";
import AccountProfile from "../components/AccountProfile";
import AccountPassword from "../components/AccountPassword";
import AccountSecurity from "../components/AccountSecurity";
import AccountStore from "../components/AccountStore";
import { useUserStore } from "../stores/user.store";
import { useOrderStore } from "../stores/order.store";
import { useAddressStore } from "../stores/address.store";
import { useVendorStore } from "../stores/vendor.store";
import { useReturnStore } from "../stores/return.store";
import PleaseLogin from "../components/PleaseLogin";
import { useTranslation } from "react-i18next";

const MyAccountPage: React.FC = () => {
  const { t } = useTranslation();
  const logout = useUserStore((state) => state.logout);
  const user = useUserStore((state) => state.user);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Orders and addresses from stores
  const fetchUserOrders = useOrderStore((state) => state.fetchUserOrders);
  const fetchUserAddresses = useAddressStore((state) => state.fetchUserAddresses);
  const fetchMyReturns = useReturnStore((state) => state.fetchMyReturns);
  const fetchVendorStore = useVendorStore((state) => state.fetchVendorStore);

  useEffect(() => {
    if (user?._id) {
      fetchUserOrders();
      fetchUserAddresses();
      fetchMyReturns();
      if (user.role === "store") fetchVendorStore();
    }
  }, [user?._id, fetchUserAddresses, fetchUserOrders, fetchVendorStore, fetchMyReturns, user?.role]);

  type MenuItem = { id: string; label: string; icon: string; desc: string; href?: string };
  const menuItems: MenuItem[] = [
    { id: "dashboard", label: t("account.dashboard", "Dashboard"), icon: "📊", desc: t("account.dashboardDesc", "Overview & stats") },
    { id: "orders", label: t("account.orders", "Orders"), icon: "📦", desc: t("account.ordersDesc", "Track & manage") },
    { id: "returns", label: t("account.returns", "Returns"), icon: "📤", desc: t("account.returnsDesc", "Return requests") },
    { id: "addresses", label: t("account.addresses", "Addresses"), icon: "📍", desc: t("account.addressesDesc", "Shipping info") },
    { id: "profile", label: t("account.accountDetails", "Profile"), icon: "👤", desc: t("account.profileDesc", "Personal info") },
    { id: "password", label: t("account.changePassword", "Password"), icon: "🔒", desc: t("account.passwordDesc", "Security settings") },
    { id: "security", label: t("account.security", "2FA"), icon: "🛡️", desc: t("account.securityDesc", "Two-factor authentication") },
    { id: "notifications", label: t("account.notifications", "Notifications"), icon: "🔔", desc: t("account.notificationsDesc", "Email & alert preferences"), href: "/account/notifications" },
    ...(user?.role === "store" ? [{ id: "store", label: t("account.myStore", "My Store"), icon: "🏪", desc: t("account.storeDesc", "Vendor panel") }] : []),
  ];

  const handleMenuClick = (id: string) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  if (!user) return <PleaseLogin />;

  const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />

      {/* ===== PROFILE HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-accent)] to-[#0B0B10]"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-60"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center overflow-hidden shadow-xl">
                {user?.profilePicture ? (
                  <img loading="lazy" decoding="async" src={user.profilePicture} alt="Profile" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">{user?.name?.[0]?.toUpperCase() || "👤"}</span>
                )}
              </div>
              <button onClick={() => setActiveTab("profile")} className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md text-xs hover:scale-110 transition-transform">✏️</button>
            </div>
            {/* Info */}
            <div className="text-center sm:text-left">
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white">{user?.name}</h1>
              <p className="text-white/70 text-sm mt-0.5">{user?.email}</p>
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                {memberSince && <span className="text-[10px] bg-white/15 text-white/80 px-2.5 py-1 rounded-full border border-white/10">{t("account.memberSince", "Member since")} {memberSince}</span>}
                {user.role === "store" && <span className="text-[10px] bg-amber-400/20 text-amber-200 px-2.5 py-1 rounded-full border border-amber-400/20">🏪 {t("account.vendor", "Vendor")}</span>}
              </div>
            </div>
            {/* Quick Actions */}
            <div className="sm:ml-auto flex gap-2">
              <Link to="/wishlist" className="bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-medium px-4 py-2 rounded-xl hover:bg-white/25 transition-all flex items-center gap-1.5">❤️ {t("account.wishlist", "Wishlist")}</Link>
              <Link to="/cart" className="bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-medium px-4 py-2 rounded-xl hover:bg-white/25 transition-all flex items-center gap-1.5">🛒 {t("account.cart", "Cart")}</Link>
            </div>
          </div>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-white/50 mt-5">
            <Link to="/" className="hover:text-white transition-colors">{t("common.home", "Home")}</Link>
            <span>/</span>
            <span className="text-white/80">{t("account.myAccount", "My Account")}</span>
          </nav>
        </div>
      </section>

      {/* ===== MOBILE TAB BAR ===== */}
      <div className="lg:hidden sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--border)] shadow-sm">
        <div className="flex items-center justify-between px-4 py-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            {menuItems.find(m => m.id === activeTab)?.icon} {menuItems.find(m => m.id === activeTab)?.label}
          </button>
        </div>
        {sidebarOpen && (
          <div className="border-t border-[var(--border)] bg-[var(--surface)] px-2 py-2 space-y-1 max-h-[60vh] overflow-y-auto">
            {menuItems.map((item) => (
              item.href ? (
                <Link key={item.id} to={item.href} onClick={() => setSidebarOpen(false)} className="w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-2.5 transition-all text-[var(--text-muted)] hover:bg-[var(--surface-2)]">
                  <span className="text-base">{item.icon}</span>{item.label}
                </Link>
              ) : (
                <button key={item.id} onClick={() => handleMenuClick(item.id)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-2.5 transition-all ${activeTab === item.id ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]"}`}>
                  <span className="text-base">{item.icon}</span>{item.label}
                </button>
              )
            ))}
            <hr className="border-[var(--border)] my-1" />
            <button onClick={() => { if (confirm(t("account.logoutConfirm", "Are you sure you want to logout?"))) logout(); }} className="w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
              <span className="text-base">🚪</span>{t("account.logout", "Logout")}
            </button>
          </div>
        )}
      </div>

      <main className="py-6 lg:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

            {/* ===== DESKTOP SIDEBAR ===== */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-6 space-y-3">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-2">
                  <nav className="space-y-0.5">
                    {menuItems.map((item) => (
                      item.href ? (
                        <Link key={item.id} to={item.href} className="w-full text-left px-3.5 py-3 rounded-xl flex items-center gap-3 transition-all group hover:bg-[var(--surface-2)]">
                          <span className="text-lg shrink-0 group-hover:scale-105 transition-transform">{item.icon}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--text)]">{item.label}</div>
                            <div className="text-[10px] text-[var(--text-subtle)] truncate">{item.desc}</div>
                          </div>
                        </Link>
                      ) : (
                        <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center gap-3 transition-all group ${activeTab === item.id ? "bg-gradient-to-r from-[var(--brand-primary)]/10 to-[var(--brand-accent)]/5 border border-[var(--brand-primary)]/20" : "hover:bg-[var(--surface-2)]"}`}>
                          <span className={`text-lg shrink-0 ${activeTab === item.id ? "scale-110" : "group-hover:scale-105"} transition-transform`}>{item.icon}</span>
                          <div className="min-w-0">
                            <div className={`text-sm font-medium ${activeTab === item.id ? "text-[var(--brand-primary)]" : "text-[var(--text)]"}`}>{item.label}</div>
                            <div className="text-[10px] text-[var(--text-subtle)] truncate">{item.desc}</div>
                          </div>
                          {activeTab === item.id && <div className="ml-auto w-1.5 h-6 rounded-full bg-[var(--brand-primary)]"></div>}
                        </button>
                      )
                    ))}
                  </nav>
                </div>

                {/* Logout */}
                <button onClick={() => { if (confirm(t("account.logoutConfirm", "Are you sure you want to logout?"))) logout(); }} className="w-full px-3.5 py-3 rounded-2xl border border-red-200 dark:border-red-500/20 flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group">
                  <span className="text-lg">🚪</span>
                  <span className="text-sm font-medium">{t("account.logout", "Logout")}</span>
                </button>

                {/* Help Card */}
                <div className="bg-gradient-to-br from-[var(--brand-primary)]/5 to-[var(--brand-accent)]/5 border border-[var(--brand-primary)]/10 rounded-2xl p-4">
                  <h4 className="text-sm font-semibold text-[var(--text)] mb-1">{t("account.needHelp", "Need Help?")}</h4>
                  <p className="text-xs text-[var(--text-muted)] mb-3">{t("account.helpDesc", "Our support team is available 24/7 to assist you.")}</p>
                  <Link to="/contact" className="text-xs font-semibold text-[var(--brand-primary)] hover:underline">{t("account.contactSupport", "Contact Support")} →</Link>
                </div>
              </div>
            </aside>

            {/* ===== MAIN CONTENT ===== */}
            <div className="lg:col-span-9">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 lg:p-8 min-h-[500px]">
                {activeTab === "dashboard" && <AccountDashboard />}
                {activeTab === "orders" && <AccountOrders />}
                {activeTab === "returns" && <AccountReturns />}
                {activeTab === "addresses" && <AccountAddresses />}
                {activeTab === "profile" && <AccountProfile />}
                {activeTab === "password" && <AccountPassword />}
                {activeTab === "security" && <AccountSecurity />}
                {activeTab === "store" && user?.role === "store" && <AccountStore />}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MyAccountPage;
