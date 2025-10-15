import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AccountDashboard from "../components/AccountDashboard";
import AccountOrders from "../components/AccountOrders";
import AccountAddresses from "../components/AccountAddresses";
import AccountProfile from "../components/AccountProfile";
import AccountPassword from "../components/AccountPassword";
import { useUserStore } from "../stores/user.store";
import { useOrderStore } from "../stores/order.store";
import { useAddressStore } from "../stores/address.store";
import PleaseLogin from "../components/PleaseLogin";

const MyAccountPage: React.FC = () => {
  const logout = useUserStore((state) => state.logout);
  const user = useUserStore((state) => state.user);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Orders and addresses from stores
  const fetchUserOrders = useOrderStore((state) => state.fetchUserOrders);
  const fetchUserAddresses = useAddressStore(
    (state) => state.fetchUserAddresses
  );

  // Fetch user orders and addresses on mount or when user changes
  useEffect(() => {
    if (user?._id) {
      fetchUserOrders();
      fetchUserAddresses();
    }
  }, [user?._id, fetchUserAddresses, fetchUserOrders]);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "orders", label: "Orders", icon: "📦" },
    { id: "addresses", label: "Addresses", icon: "📍" },
    { id: "profile", label: "Account Details", icon: "👤" },
    { id: "password", label: "Change Password", icon: "🔒" },
    { id: "logout", label: "Logout", icon: "🚪" },
  ];

  if (!user) return <PleaseLogin />;
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      {/* Hero Section */}
      <div className="relative bg-gray-100 py-16">
        <div className="absolute inset-0">
          <img
            src="net1.jpeg"
            alt="Camera"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">My Account</h1>
          <nav className="text-sm text-gray-600">
            <Link to="/" className="hover:text-gray-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span>My Account</span>
          </nav>
        </div>
        {/* Camera Image positioned on the right */}
        <div className="absolute right-0 top-0 h-full w-1/2 hidden lg:block">
          <img
            src="net1.jpeg"
            alt="Professional Camera"
            className="h-full w-full object-contain"
          />
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

                {/* Addresses */}
                {activeTab === "addresses" && <AccountAddresses />}

                {/* Profile */}
                {activeTab === "profile" && <AccountProfile />}

                {/* Password Change */}
                {activeTab === "password" && <AccountPassword />}
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
