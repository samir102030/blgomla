import React, { useState, useEffect } from "react";
import { useUserStore } from "../stores/user.store";
import { axiosInstance } from "../lib/axios";

const AccountProfile: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const updateProfile = useUserStore((state) => state.updateProfile);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    phoneNumber: user?.phoneNumber || "",
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  // Update profile form when user changes
  useEffect(() => {
    setProfileForm({
      name: user?.name || "",
      phoneNumber: user?.phoneNumber || "",
    });
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?._id) return;
    setProfileLoading(true);
    try {
      await updateProfile(profileForm);
      alert("Profile updated successfully!");
    } catch (error: any) {
      alert(error?.response?.data?.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
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
      const { data } = await axiosInstance.post("/upload/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await updateProfile({ profilePicture: data.url });
      setSelectedImage(null);
      setImagePreview(null);
      alert("Image uploaded successfully!");
    } catch (error: any) {
      alert(error?.response?.data?.message || "Failed to upload image");
    } finally {
      setImageUploading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Details</h2>

      {/* Profile Image Upload */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Profile Picture
        </h3>
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedImage && (
              <button
                onClick={handleImageUpload}
                disabled={imageUploading}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {imageUploading ? "Uploading..." : "Upload Image"}
              </button>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleProfileUpdate} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name
          </label>
          <input
            type="text"
            value={profileForm.name}
            onChange={(e) =>
              setProfileForm((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
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
            value={profileForm.phoneNumber}
            onChange={(e) =>
              setProfileForm((prev) => ({
                ...prev,
                phoneNumber: e.target.value,
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={profileLoading}
          className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {profileLoading ? "Updating..." : "Update Profile"}
        </button>
      </form>
    </div>
  );
};

export default AccountProfile;
