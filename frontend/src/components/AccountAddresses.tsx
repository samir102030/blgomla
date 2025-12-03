import React, { useState } from "react";
import { useAddressStore } from "../stores/address.store";

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

const AccountAddresses: React.FC = () => {
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
  const [addressForm, setAddressForm] = useState<any>(initialAddressState);
  const [addressLoading, setAddressLoading] = useState(false);

  const deleteAddress = useAddressStore((state) => state.deleteAddress);
  const updateAddress = useAddressStore((state) => state.updateAddress);
  const createAddress = useAddressStore((state) => state.createAddress);
  const addresses = useAddressStore((state) => state.addresses);
  const fetchUserAddresses = useAddressStore(
    (state) => state.fetchUserAddresses
  );

  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressForm(initialAddressState);
    setShowAddressModal(true);
  };

  const handleEditAddress = (address: any) => {
    setEditingAddress(address);
    setAddressForm({ ...address });
    setShowAddressModal(true);
  };

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

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressLoading(true);
    try {
      if (editingAddress && editingAddress._id) {
        await updateAddress(editingAddress._id, addressForm);
      } else {
        await createAddress(addressForm);
      }
      // Refresh addresses list
      await fetchUserAddresses();
      setShowAddressModal(false);
    } catch (err) {
      const error = err as Error | any;
      alert(
        error?.response?.data?.message ||
          "Failed to save address. Please try again."
      );
    } finally {
      setAddressLoading(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this address?"))
      return;
    setAddressLoading(true);
    try {
      await deleteAddress(id);
      // Refresh addresses list
      await fetchUserAddresses();
    } catch (err) {
      const error = err as Error | any;
      alert(
        error?.response?.data?.message ||
          "Failed to delete address. Please try again."
      );
    } finally {
      setAddressLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Addresses</h2>
        <button
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          onClick={handleAddAddress}
        >
          Add New Address
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
              <p className="font-medium text-gray-900">{address.name}</p>
              <p>{address.address}</p>
              <p>
                {address.city}
                {address.state ? `, ${address.state}` : ""} {address.zipCode}
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
            </div>
          </div>
        ))}
      </div>

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
              {editingAddress ? "Edit Address" : "Add New Address"}
            </h2>
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
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
                <label className="block text-sm font-medium mb-1">Phone</label>
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
                <label className="block text-sm font-medium mb-1">City</label>
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
                <label className="block text-sm font-medium mb-1">State</label>
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
                    <option value="Shipping">Shipping</option>
                    <option value="Billing">Billing</option>
                  </select>
                </label>
              </div>
              <button
                type="submit"
                className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
                disabled={addressLoading}
              >
                {editingAddress ? "Update Address" : "Add Address"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountAddresses;
