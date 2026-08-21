import React, { useState, useEffect } from "react";
import type { ComponentType, SVGProps } from "react";
import { ArrowRightOnRectangleIcon, ArrowUpTrayIcon, BellIcon, BuildingStorefrontIcon, ChartBarIcon, CubeIcon, LockClosedIcon, MapPinIcon, PencilIcon, ShieldCheckIcon, UserIcon } from "@heroicons/react/24/outline";
import Breadcrumb from "../components/Breadcrumb";
import { Link, useSearchParams } from "react-router-dom";
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
import AccountPrivacy from "../components/AccountPrivacy";
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
  /**
   * Which panel is open lives in the address bar.
   *
   * It was local state, so nothing outside this component could open a tab:
   * the dashboard's own "check the orders tab" notice had no way to act on
   * its own advice, and the arrow beside it was a character rather than a
   * link. It also means the back button steps between tabs and a customer
   * can bookmark or send the page they are actually looking at.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";

  const setActiveTab = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (id === "dashboard") next.delete("tab");
    else next.set("tab", id);
    // A particular order only makes sense on the tab it was opened from.
    next.delete("order");
    setSearchParams(next);
  };
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

  type MenuItem = { id: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; desc: string; href?: string };
  const menuItems: MenuItem[] = [
    { id: "dashboard", label: t("account.dashboard", "Dashboard"), icon: ChartBarIcon, desc: t("account.dashboardDesc", "Overview & stats") },
    { id: "orders", label: t("account.orders", "Orders"), icon: CubeIcon, desc: t("account.ordersDesc", "Track & manage") },
    { id: "returns", label: t("account.returns", "Returns"), icon: ArrowUpTrayIcon, desc: t("account.returnsDesc", "Return requests") },
    { id: "addresses", label: t("account.addresses", "Addresses"), icon: MapPinIcon, desc: t("account.addressesDesc", "Shipping info") },
    { id: "profile", label: t("account.accountDetails", "Profile"), icon: UserIcon, desc: t("account.profileDesc", "Personal info") },
    { id: "password", label: t("account.changePassword", "Password"), icon: LockClosedIcon, desc: t("account.passwordDesc", "Security settings") },
    { id: "security", label: t("account.security", "2FA"), icon: ShieldCheckIcon, desc: t("account.securityDesc", "Two-factor authentication") },
    { id: "privacy", label: t("account.privacy", "Privacy & Data"), icon: LockClosedIcon, desc: t("account.privacyDesc", "Export or delete your data") },
    { id: "notifications", label: t("account.notifications", "Notifications"), icon: BellIcon, desc: t("account.notificationsDesc", "Email & alert preferences"), href: "/account/notifications" },
    ...(user?.role === "store" ? [{ id: "store", label: t("account.myStore", "My Store"), icon: BuildingStorefrontIcon, desc: t("account.storeDesc", "Vendor panel") }] : []),
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
      {/* Keeps its own layout — the avatar belongs beside the name, not in the
          shared header's aside slot — but sits on the same canvas as every
          other page. text-left / ml-auto were physical, so in Arabic the name
          stayed left-aligned and the quick actions bunched up on the wrong
          side of the avatar. */}
      <section className="relative isolate overflow-hidden bg-[var(--ink-canvas)]">
        <div className="absolute inset-0 grid-lines opacity-[0.5] pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-32 ltr:-left-20 rtl:-right-20 w-[26rem] h-[26rem] rounded-full bg-[#00A8E8] opacity-[0.14] blur-[110px] animate-drift" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none bg-gradient-to-b from-transparent to-[var(--bg)]" aria-hidden="true" />

        <div className="relative shell py-10 lg:py-14">
          <Breadcrumb
            className="mb-6"
            onInk
            items={[
              { label: t("common.home", "Home"), to: "/" },
              { label: t("account.myAccount", "My Account") },
            ]}
          />
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl panel-glass flex items-center justify-center overflow-hidden shadow-xl">
                {user?.profilePicture ? (
                  <img loading="lazy" decoding="async" src={user.profilePicture} alt="Profile" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} className="w-full h-full object-cover" />
                ) : (
 <span className="text-4xl">{user?.name?.[0]?.toUpperCase() || ""}</span>
                )}
              </div>
              <button onClick={() => setActiveTab("profile")} className="absolute -bottom-1 ltr:-right-1 rtl:-left-1 w-7 h-7 bg-[var(--surface)] rounded-full flex items-center justify-center shadow-md text-xs hover:scale-110 transition-transform" aria-label={t("account.editProfile", "Edit profile")}><PencilIcon className="w-5 h-5" aria-hidden="true" /></button>
            </div>
            {/* Info */}
            <div className="text-center sm:text-start">
              <h1 className="text-display-sm text-[var(--on-ink)]">{user?.name}</h1>
              <p className="text-[var(--on-ink-muted)] text-sm mt-1">{user?.email}</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                {memberSince && <span className="chip chip-on-ink">{t("account.memberSince", "Member since")} {memberSince}</span>}
 {user.role === "store" && <span className="chip chip-on-ink"> {t("account.vendor", "Vendor")}</span>}
              </div>
            </div>
            {/* Quick Actions */}
            <div className="sm:ms-auto flex gap-2">
 <Link to="/wishlist" className="btn btn-sm btn-on-ink"> {t("account.wishlist", "Wishlist")}</Link>
 <Link to="/cart" className="btn btn-sm btn-on-ink"> {t("account.cart", "Cart")}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MOBILE TAB BAR ===== */}
      <div className="lg:hidden sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--border)] shadow-sm">
        <div className="flex items-center justify-between px-4 py-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            {menuItems.find(m => m.id === activeTab)?.label}
          </button>
        </div>
        {sidebarOpen && (
          <div className="border-t border-[var(--border)] bg-[var(--surface)] px-2 py-2 space-y-1 max-h-[60vh] overflow-y-auto">
            {menuItems.map((item) => (
              item.href ? (
                <Link key={item.id} to={item.href} onClick={() => setSidebarOpen(false)} className="w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-2.5 transition-all text-[var(--text-muted)] hover:bg-[var(--surface-2)]">
                  <item.icon className="w-5 h-5 shrink-0" aria-hidden="true" />{item.label}
                </Link>
              ) : (
                <button key={item.id} onClick={() => handleMenuClick(item.id)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-2.5 transition-all ${activeTab === item.id ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]"}`}>
                  <item.icon className="w-5 h-5 shrink-0" aria-hidden="true" />{item.label}
                </button>
              )
            ))}
            <hr className="border-[var(--border)] my-1" />
            <button onClick={() => { if (confirm(t("account.logoutConfirm", "Are you sure you want to logout?"))) logout(); }} className="w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
              <span className="text-base"><ArrowRightOnRectangleIcon className="w-5 h-5" aria-hidden="true" /></span>{t("account.logout", "Logout")}
            </button>
          </div>
        )}
      </div>

      <main className="py-6 lg:py-10">
        <div className="shell">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

            {/* ===== DESKTOP SIDEBAR ===== */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-6 space-y-3">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-2">
                  <nav className="space-y-0.5">
                    {menuItems.map((item) => (
                      item.href ? (
                        <Link key={item.id} to={item.href} className="w-full text-left px-3.5 py-3 rounded-xl flex items-center gap-3 transition-all group hover:bg-[var(--surface-2)]">
                          <item.icon className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" aria-hidden="true" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--text)]">{item.label}</div>
                            <div className="text-[10px] text-[var(--text-subtle)] truncate">{item.desc}</div>
                          </div>
                        </Link>
                      ) : (
                        <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center gap-3 transition-all group ${activeTab === item.id ? "bg-gradient-to-r from-[var(--brand-primary)]/10 to-[var(--brand-accent)]/5 border border-[var(--brand-primary)]/20" : "hover:bg-[var(--surface-2)]"}`}>
                          <item.icon className={`w-5 h-5 shrink-0 ${activeTab === item.id ? "scale-110" : "group-hover:scale-105"} transition-transform`} aria-hidden="true" />
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
                  <span className="text-lg"><ArrowRightOnRectangleIcon className="w-5 h-5" aria-hidden="true" /></span>
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
                {activeTab === "privacy" && <AccountPrivacy />}
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
