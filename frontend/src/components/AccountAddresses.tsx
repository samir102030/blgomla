import React, { useState } from "react";
import { MapPinIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAddressStore } from "../stores/address.store";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

const initialAddressState = { name: "", phone: "", address: "", city: "", state: "", zipCode: "", country: "", isDefault: false, type: "Shipping" };

const AccountAddresses: React.FC = () => {
  const { t } = useTranslation();
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
  const [addressForm, setAddressForm] = useState<any>(initialAddressState);
  const [addressLoading, setAddressLoading] = useState(false);

  const deleteAddress = useAddressStore((state) => state.deleteAddress);
  const updateAddress = useAddressStore((state) => state.updateAddress);
  const createAddress = useAddressStore((state) => state.createAddress);
  const addresses = useAddressStore((state) => state.addresses);
  const fetchUserAddresses = useAddressStore((state) => state.fetchUserAddresses);

  const handleAddAddress = () => { setEditingAddress(null); setAddressForm(initialAddressState); setShowAddressModal(true); };
  const handleEditAddress = (address: any) => { setEditingAddress(address); setAddressForm({ ...address }); setShowAddressModal(true); };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let fieldValue: any = value;
    if (type === "checkbox" && "checked" in e.target) fieldValue = (e.target as HTMLInputElement).checked;
    setAddressForm((prev: any) => ({ ...prev, [name]: fieldValue }));
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressLoading(true);
    try {
      if (editingAddress && editingAddress._id) await updateAddress(editingAddress._id, addressForm);
      else await createAddress(addressForm);
      await fetchUserAddresses();
      setShowAddressModal(false);
      toast.success(editingAddress ? t("account.addressUpdated", "Address updated!") : t("account.addressAdded", "Address added!"));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("account.addressSaveFailed", "Failed to save address."));
    } finally { setAddressLoading(false); }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm(t("account.deleteAddressConfirm", "Are you sure you want to delete this address?"))) return;
    setAddressLoading(true);
    try { await deleteAddress(id); await fetchUserAddresses(); toast.success(t("account.addressDeleted", "Address deleted.")); }
    catch (err: any) { toast.error(err?.response?.data?.message || t("account.addressDeleteFailed", "Failed to delete address.")); }
    finally { setAddressLoading(false); }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text)]">{t("account.addresses", "Addresses")}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">{t("account.addressesSubtitle", "Manage your shipping and billing addresses.")}</p>
        </div>
        <button onClick={handleAddAddress} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] hover:shadow-lg hover:shadow-[var(--brand-primary)]/20 transition-all flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {t("account.addAddress", "Add Address")}
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] p-10 text-center">
          <span className="text-4xl"><MapPinIcon className="w-9 h-9" aria-hidden="true" /></span>
          <p className="text-sm text-[var(--text-muted)] mt-3">{t("account.noAddresses", "No addresses saved yet. Add one to speed up checkout!")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div key={address._id} className="bg-[var(--surface-2)]/50 border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--brand-primary)]/30 transition-all relative group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
 <span className="text-lg">{address.type === "Billing" ? "" : ""}</span>
                  <h3 className="text-sm font-semibold text-[var(--text)]">{address.type} {t("account.addressLabel", "Address")}</h3>
                </div>
                {address.isDefault && (
                  <span className="text-[10px] font-semibold bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-2 py-0.5 rounded-full">{t("account.default", "Default")}</span>
                )}
              </div>
              <div className="text-sm text-[var(--text-muted)] space-y-0.5">
                <p className="font-medium text-[var(--text)]">{address.name}</p>
                <p>{address.address}</p>
                <p>{address.city}{address.state ? `, ${address.state}` : ""} {address.zipCode}</p>
                <p>{address.country}</p>
 {address.phone && <p className="text-xs text-[var(--text-subtle)]"> {address.phone}</p>}
              </div>
              <div className="mt-4 flex gap-3 pt-3 border-t border-[var(--border)]">
                <button onClick={() => handleEditAddress(address)} className="text-xs font-semibold text-[var(--brand-primary)] hover:underline">{t("account.edit", "Edit")}</button>
                <button onClick={() => handleDeleteAddress(address._id)} disabled={addressLoading} className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50">{t("account.delete", "Delete")}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors" onClick={() => setShowAddressModal(false)} aria-label="Close"><XMarkIcon className="w-5 h-5" aria-hidden="true" /></button>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-[var(--text)]">{editingAddress ? t("account.editAddress", "Edit Address") : t("account.addNewAddress", "Add New Address")}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">{t("account.addressFormDesc", "Fill in your shipping or billing details.")}</p>
            </div>
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t("account.recipientName", "Recipient Name")}</label>
                  <input type="text" name="name" value={addressForm.name} onChange={handleAddressChange} className={inputClass} required />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t("account.phone", "Phone")}</label>
                  <input type="text" name="phone" value={addressForm.phone} onChange={handleAddressChange} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t("account.streetAddress", "Street Address")}</label>
                <input type="text" name="address" value={addressForm.address} onChange={handleAddressChange} className={inputClass} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t("account.city", "City")}</label>
                  <input type="text" name="city" value={addressForm.city} onChange={handleAddressChange} className={inputClass} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t("account.stateRegion", "State / Region")}</label>
                  <input type="text" name="state" value={addressForm.state} onChange={handleAddressChange} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t("account.zipCode", "Zip Code")}</label>
                  <input type="text" name="zipCode" value={addressForm.zipCode} onChange={handleAddressChange} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t("account.country", "Country")}</label>
                  <input type="text" name="country" value={addressForm.country} onChange={handleAddressChange} className={inputClass} />
                </div>
              </div>
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer">
                  <input type="checkbox" name="isDefault" checked={!!addressForm.isDefault} onChange={handleAddressChange} className="w-4 h-4 rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
                  {t("account.setDefault", "Set as default")}
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <span>{t("account.type", "Type")}:</span>
                  <select name="type" value={addressForm.type} onChange={handleAddressChange} className="text-sm border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40">
                    <option value="Shipping">{t("account.shipping", "Shipping")}</option>
                    <option value="Billing">{t("account.billing", "Billing")}</option>
                  </select>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddressModal(false)} className="flex-1 py-3 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-all">{t("common.cancel", "Cancel")}</button>
                <button type="submit" disabled={addressLoading} className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] hover:shadow-lg transition-all disabled:opacity-50">
                  {addressLoading ? "..." : editingAddress ? t("account.updateAddress", "Update Address") : t("account.addAddress", "Add Address")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountAddresses;
