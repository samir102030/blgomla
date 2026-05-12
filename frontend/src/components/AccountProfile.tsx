import React, { useState, useEffect } from "react";
import { useUserStore } from "../stores/user.store";
import { axiosInstance } from "../lib/axios";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

const AccountProfile: React.FC = () => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const updateProfile = useUserStore((state) => state.updateProfile);

  const [profileForm, setProfileForm] = useState({ name: user?.name || "", phoneNumber: user?.phoneNumber || "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    setProfileForm({ name: user?.name || "", phoneNumber: user?.phoneNumber || "" });
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?._id) return;
    setProfileLoading(true);
    try {
      await updateProfile(profileForm);
      toast.success(t("account.profileUpdated", "Profile updated successfully!"));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("account.profileUpdateFailed", "Failed to update profile"));
    } finally { setProfileLoading(false); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage || !user?._id) return;
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedImage);
      const { data } = await axiosInstance.post("/upload/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      await updateProfile({ profilePicture: data.url });
      setSelectedImage(null);
      setImagePreview(null);
      toast.success(t("account.imageUploaded", "Image uploaded successfully!"));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("account.imageUploadFailed", "Failed to upload image"));
    } finally { setImageUploading(false); }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all";

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">{t("account.accountDetails", "Account Details")}</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">{t("account.profileSubtitle", "Manage your personal information and profile picture.")}</p>
      </div>

      {/* Profile Picture */}
      <div className="bg-[var(--surface-2)]/50 border border-[var(--border)] rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-4">{t("account.profilePicture", "Profile Picture")}</h3>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center justify-center overflow-hidden shrink-0">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            ) : user?.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl text-[var(--text-subtle)]">{user?.name?.[0]?.toUpperCase() || "👤"}</span>
            )}
          </div>
          <div className="flex-1">
            <input type="file" accept="image/*" onChange={handleImageChange} className="block w-full text-sm text-[var(--text-muted)] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[var(--brand-primary)]/10 file:text-[var(--brand-primary)] hover:file:bg-[var(--brand-primary)]/20 file:cursor-pointer file:transition-colors" />
            {selectedImage && (
              <button onClick={handleImageUpload} disabled={imageUploading} className="mt-3 text-sm font-semibold text-white bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] px-5 py-2 rounded-xl hover:shadow-lg transition-all disabled:opacity-50">
                {imageUploading ? t("account.uploading", "Uploading...") : t("account.uploadImage", "Upload Image")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleProfileUpdate} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">{t("account.name", "Full Name")}</label>
          <input type="text" value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} className={inputClass} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">{t("account.emailAddress", "Email Address")}</label>
          <input type="email" value={user?.email || ""} readOnly className={inputClass + " opacity-60 cursor-not-allowed"} />
          <p className="text-[10px] text-[var(--text-subtle)] mt-1">{t("account.emailReadonly", "Email cannot be changed for security reasons.")}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">{t("account.phoneNumber", "Phone Number")}</label>
          <input type="tel" value={profileForm.phoneNumber} onChange={(e) => setProfileForm((prev) => ({ ...prev, phoneNumber: e.target.value }))} className={inputClass} placeholder={t("account.phonePlaceholder", "+20 1xx xxxx xxxx")} />
        </div>
        <button type="submit" disabled={profileLoading} className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] hover:shadow-lg hover:shadow-[var(--brand-primary)]/20 transition-all disabled:opacity-50">
          {profileLoading ? t("account.updating", "Updating...") : t("account.updateProfile", "Update Profile")}
        </button>
      </form>
    </div>
  );
};

export default AccountProfile;
