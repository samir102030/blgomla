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

  // Orders and addresses from stores
  const fetchUserOrders = useOrderStore((state) => state.fetchUserOrders);
  const fetchUserAddresses = useAddressStore(
    (state) => state.fetchUserAddresses
  );
  const fetchMyReturns = useReturnStore((state) => state.fetchMyReturns);

  // Vendor store
  const fetchVendorStore = useVendorStore((state) => state.fetchVendorStore);

  // Fetch user orders and addresses on mount or when user changes
  useEffect(() => {
    if (user?._id) {
      fetchUserOrders();
      fetchUserAddresses();
      fetchMyReturns();
      if (user.role === "store") {
        fetchVendorStore();
      }
    }
  }, [
    user?._id,
    fetchUserAddresses,
    fetchUserOrders,
    fetchVendorStore,
    fetchMyReturns,
    user?.role,
  ]);

  const menuItems = [
    { id: "dashboard", label: t("account.dashboard"), icon: "📊" },
    { id: "orders", label: t("account.orders"), icon: "📦" },
    { id: "returns", label: t("account.returns"), icon: "📤" },
    { id: "addresses", label: t("account.addresses"), icon: "📍" },
    { id: "profile", label: t("account.accountDetails"), icon: "👤" },
    { id: "password", label: t("account.changePassword"), icon: "🔒" },
    ...(user?.role === "store"
      ? [{ id: "store", label: t("account.myStore"), icon: "🏪" }]
      : []),
    { id: "logout", label: t("account.logout"), icon: "🚪" },
  ];

  if (!user) return <PleaseLogin />;
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-[#002B5B] to-[#004080] text-white py-16">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">My Account</h1>
          <nav className="text-sm opacity-90">
            <Link to="/" className="hover:opacity-100">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span>My Account</span>
          </nav>
        </div>
      </div>

      <main className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Menu */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                    {user?.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl">👤</span>
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-gray-900">{user?.name}</h3>
                    <p className="text-sm text-gray-600">{user?.email}</p>
                  </div>
                </div>

                <nav className="space-y-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === "logout") {
                          if (confirm("Are you sure you want to logout?"))
                            logout();
                        } else setActiveTab(item.id);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center ${
                        activeTab === item.id
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm p-8">
                {/* Dashboard */}
                {activeTab === "dashboard" && <AccountDashboard />}

                {/* Orders */}
                {activeTab === "orders" && <AccountOrders />}

                {/* Returns */}
                {activeTab === "returns" && <AccountReturns />}

                {/* Addresses */}
                {activeTab === "addresses" && <AccountAddresses />}

                {/* Profile */}
                {activeTab === "profile" && <AccountProfile />}

                {/* Password Change */}
                {activeTab === "password" && <AccountPassword />}

                {/* Store */}
                {activeTab === "store" && user?.role === "store" && (
                  <AccountStore />
                )}
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
