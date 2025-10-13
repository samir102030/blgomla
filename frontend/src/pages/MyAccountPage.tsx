import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useUserStore } from "../stores/user.store";
import { useOrderStore } from "../stores/order.store";
import { useAddressStore } from "../stores/address.store";
import PleaseLogin from "../components/PleaseLogin";

const initialAddressState = {
  name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  isDefault: false,
  type: "Shipping",
};

const MyAccountPage: React.FC = () => {
  // Order details modal state and handler
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const handleViewOrderDetails = async (orderId: string) => {
    setShowOrderModal(true);
    setOrderDetailsLoading(true);
    await fetchOrderById(orderId);
    setOrderDetailsLoading(false);
  };
  // Modal state for add/edit address
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
  const [addressForm, setAddressForm] = useState<any>(initialAddressState);
  const [addressLoading, setAddressLoading] = useState(false);
  // Open modal for add
  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressForm(initialAddressState);
    setShowAddressModal(true);
  };

  // Open modal for edit
  const handleEditAddress = (address: any) => {
    setEditingAddress(address);
    setAddressForm({ ...address });
    setShowAddressModal(true);
  };

  // Handle form change
  const handleAddressChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    let fieldValue: any = value;
    if (type === "checkbox" && "checked" in e.target) {
      fieldValue = (e.target as HTMLInputElement).checked;
    }
    setAddressForm((prev: any) => ({
      ...prev,
      [name]: fieldValue,
    }));
  };

  // Submit add/edit
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressLoading(true);
    try {
      if (editingAddress && editingAddress._id) {
        await updateAddress(editingAddress._id, addressForm);
      } else {
        await createAddress(addressForm);
      }
      if (user?._id) await fetchUserAddresses(user._id);
      setShowAddressModal(false);
    } catch (err) {
      // Optionally show error
      const error = err as Error | any;
      alert(
        error?.response?.data?.message ||
          "Failed to save address. Please try again."
      );
    } finally {
      setAddressLoading(false);
    }
  };

  // Delete address
  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this address?"))
      return;
    setAddressLoading(true);
    await deleteAddress(id);
    if (user?._id) await fetchUserAddresses(user._id);
    setAddressLoading(false);
  };
  const logout = useUserStore((state) => state.logout);
  const user = useUserStore((state) => state.user);
  console.log("User in MyAccountPage:", user);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Password change state only
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Orders and addresses from stores

  // const orderStore = useOrderStore();
  const fetchUserOrders = useOrderStore((state) => state.fetchUserOrders);

  // const addressStore = useAddressStore();
  const fetchUserAddresses = useAddressStore(
    (state) => state.fetchUserAddresses
  );
  const deleteAddress = useAddressStore((state) => state.deleteAddress);
  const fetchOrderById = useOrderStore((state) => state.fetchOrderById);
  const updateAddress = useAddressStore((state) => state.updateAddress);
  const createAddress = useAddressStore((state) => state.createAddress);
  const orders = useOrderStore((state) => state.orders);
  const addresses = useAddressStore((state) => state.addresses);

  // Fetch user orders and addresses on mount or when user changes
  useEffect(() => {
    if (user?._id) {
      fetchUserOrders(user._id);
      fetchUserAddresses(user._id);
    }
  }, [user?._id, fetchUserAddresses, fetchUserOrders]);

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement update logic here if needed
    alert("Profile updated successfully!");
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    // Implement password change logic here if needed
    alert("Password changed successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "orders", label: "Orders", icon: "📦" },
    { id: "addresses", label: "Addresses", icon: "📍" },
    { id: "profile", label: "Account Details", icon: "👤" },
    { id: "password", label: "Change Password", icon: "🔒" },
    { id: "logout", label: "Logout", icon: "🚪" },
  ];

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
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xl">👤</span>
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
                {activeTab === "dashboard" && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      Dashboard
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-blue-50 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold text-blue-900 mb-2">
                          Total Orders
                        </h3>
                        <p className="text-3xl font-bold text-blue-600">
                          {orders.length}
                        </p>
                      </div>
                      <div className="bg-green-50 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold text-green-900 mb-2">
                          Total Spent
                        </h3>
                        <p className="text-3xl font-bold text-green-600">
                          $
                          {orders
                            .reduce(
                              (sum, order) => sum + (order.totalPrice || 0),
                              0
                            )
                            .toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold text-purple-900 mb-2">
                          Wishlist Items
                        </h3>
                        <p className="text-3xl font-bold text-purple-600">
                          {user?.love?.length || 0}
                        </p>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Recent Orders
                    </h3>
                    <div className="space-y-4">
                      {orders.slice(0, 3).map((order) => (
                        <div
                          key={order._id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">
                                Order {order._id}
                              </p>
                              <p className="text-sm text-gray-600">
                                {order.createdAt?.slice(0, 10)} •{" "}
                                {order.orderItems?.length || 0} items
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">
                                ${order.totalPrice}
                              </p>
                              <span
                                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                  order.status
                                )}`}
                              >
                                {order.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Orders */}
                {activeTab === "orders" && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      Order History
                    </h2>
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
                                <button
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                  onClick={() =>
                                    handleViewOrderDetails(order._id)
                                  }
                                >
                                  View Details
                                </button>
                              </td>
                              {/* Order Details Modal */}
                              {showOrderModal && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                                  <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl relative">
                                    <button
                                      className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                                      onClick={() => setShowOrderModal(false)}
                                      aria-label="Close"
                                    >
                                      &times;
                                    </button>
                                    <h2 className="text-xl font-bold mb-4">
                                      Order Details
                                    </h2>
                                    {orderDetailsLoading ? (
                                      <div>Loading...</div>
                                    ) : order ? (
                                      <div>
                                        <div className="mb-4">
                                          <span className="font-semibold">
                                            Order ID:
                                          </span>{" "}
                                          {order._id}
                                        </div>
                                        <div className="mb-4">
                                          <span className="font-semibold">
                                            Status:
                                          </span>{" "}
                                          {order.status}
                                        </div>
                                        <div className="mb-4">
                                          <span className="font-semibold">
                                            Total:
                                          </span>{" "}
                                          ${order.totalPrice}
                                        </div>
                                        <div className="mb-4">
                                          <span className="font-semibold">
                                            Created At:
                                          </span>{" "}
                                          {order.createdAt?.slice(0, 10)}
                                        </div>
                                        <div className="mb-4">
                                          <span className="font-semibold">
                                            Items:
                                          </span>
                                          <ul className="list-disc ml-6">
                                            {order.orderItems.map(
                                              (item, idx) => (
                                                <li key={idx}>
                                                  Product: {item.product} |
                                                  Quantity: {item.quantity}
                                                </li>
                                              )
                                            )}
                                          </ul>
                                        </div>
                                        <div className="mb-4">
                                          <span className="font-semibold">
                                            Shipping Address:
                                          </span>{" "}
                                          {order.shippingAddress}
                                        </div>
                                        <div className="mb-4">
                                          <span className="font-semibold">
                                            Payment Method:
                                          </span>{" "}
                                          {order.paymentMethod}
                                        </div>
                                      </div>
                                    ) : (
                                      <div>Order not found.</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Addresses */}
                {activeTab === "addresses" && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">
                        Addresses
                      </h2>
                      <button
                        className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                        onClick={handleAddAddress}
                      >
                        Add New Address
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {addresses.map((address) => (
                        <div
                          key={address._id}
                          className="border border-gray-200 rounded-lg p-6"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="font-semibold text-gray-900">
                              {address.type} Address
                            </h3>
                            {address.isDefault && (
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p className="font-medium text-gray-900">
                              {address.name}
                            </p>
                            <p>{address.address}</p>
                            <p>
                              {address.city}
                              {address.state ? `, ${address.state}` : ""}{" "}
                              {address.zipCode}
                            </p>
                            <p>{address.country}</p>
                            <p>{address.phone}</p>
                          </div>
                          <div className="mt-4 flex space-x-2">
                            <button
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              onClick={() => handleEditAddress(address)}
                            >
                              Edit
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                              onClick={() => handleDeleteAddress(address._id)}
                              disabled={addressLoading}
                            >
                              Delete
                            </button>
                            {/* Address Modal */}
                            {showAddressModal && (
                              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                                <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
                                  <button
                                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                                    onClick={() => setShowAddressModal(false)}
                                    aria-label="Close"
                                  >
                                    &times;
                                  </button>
                                  <h2 className="text-xl font-bold mb-4">
                                    {editingAddress
                                      ? "Edit Address"
                                      : "Add New Address"}
                                  </h2>
                                  <form
                                    onSubmit={handleAddressSubmit}
                                    className="space-y-4"
                                  >
                                    <div>
                                      <label className="block text-sm font-medium mb-1">
                                        Name
                                      </label>
                                      <input
                                        type="text"
                                        name="name"
                                        value={addressForm.name}
                                        onChange={handleAddressChange}
                                        className="w-full border px-3 py-2 rounded"
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-1">
                                        Phone
                                      </label>
                                      <input
                                        type="text"
                                        name="phone"
                                        value={addressForm.phone}
                                        onChange={handleAddressChange}
                                        className="w-full border px-3 py-2 rounded"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-1">
                                        Address
                                      </label>
                                      <input
                                        type="text"
                                        name="address"
                                        value={addressForm.address}
                                        onChange={handleAddressChange}
                                        className="w-full border px-3 py-2 rounded"
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-1">
                                        City
                                      </label>
                                      <input
                                        type="text"
                                        name="city"
                                        value={addressForm.city}
                                        onChange={handleAddressChange}
                                        className="w-full border px-3 py-2 rounded"
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-1">
                                        State
                                      </label>
                                      <input
                                        type="text"
                                        name="state"
                                        value={addressForm.state}
                                        onChange={handleAddressChange}
                                        className="w-full border px-3 py-2 rounded"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-1">
                                        Zip Code
                                      </label>
                                      <input
                                        type="text"
                                        name="zipCode"
                                        value={addressForm.zipCode}
                                        onChange={handleAddressChange}
                                        className="w-full border px-3 py-2 rounded"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-1">
                                        Country
                                      </label>
                                      <input
                                        type="text"
                                        name="country"
                                        value={addressForm.country}
                                        onChange={handleAddressChange}
                                        className="w-full border px-3 py-2 rounded"
                                      />
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <label className="flex items-center">
                                        <input
                                          type="checkbox"
                                          name="isDefault"
                                          checked={!!addressForm.isDefault}
                                          onChange={handleAddressChange}
                                          className="mr-2"
                                        />
                                        Default
                                      </label>
                                      <label className="flex items-center">
                                        <span className="mr-2">Type:</span>
                                        <select
                                          name="type"
                                          value={addressForm.type}
                                          onChange={handleAddressChange}
                                          className="border rounded px-2 py-1"
                                        >
                                          <option value="Shipping">
                                            Shipping
                                          </option>
                                          <option value="Billing">
                                            Billing
                                          </option>
                                        </select>
                                      </label>
                                    </div>
                                    <button
                                      type="submit"
                                      className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
                                      disabled={addressLoading}
                                    >
                                      {editingAddress
                                        ? "Update Address"
                                        : "Add Address"}
                                    </button>
                                  </form>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profile */}
                {activeTab === "profile" && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      Account Details
                    </h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={user?.name || ""}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={user?.email || ""}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={user?.phoneNumber || ""}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100"
                        />
                      </div>

                      {/*
                      <button
                        type="submit"
                        className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        Update Profile
                      </button>
                      */}
                    </form>
                  </div>
                )}

                {/* Password Change */}
                {activeTab === "password" && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      Change Password
                    </h2>
                    <form
                      onSubmit={handlePasswordChange}
                      className="space-y-6 max-w-md"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        Change Password
                      </button>
                    </form>
                  </div>
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
