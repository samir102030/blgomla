import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import { useAdvertisementStore, type Advertisement } from "../../stores/advertisement.store";

interface AdvertisementModalProps {
  isOpen: boolean;
  onClose: () => void;
  advertisement?: Advertisement;
}

type AdvertisementPosition = Advertisement["position"];

interface AdvertisementFormData {
  title: string;
  description: string;
  image: string;
  link: string;
  position: AdvertisementPosition;
  isActive: boolean;
  startDate: string;
  endDate: string;
  sortOrder: number;
}

const getInitialFormState = (): AdvertisementFormData => ({
  title: "",
  description: "",
  image: "",
  link: "",
  position: "banner",
  isActive: true,
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  sortOrder: 0,
});

const AdvertisementModal: React.FC<AdvertisementModalProps> = ({
  isOpen,
  onClose,
  advertisement,
}) => {
  const { createAdvertisement, updateAdvertisement } = useAdvertisementStore();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<AdvertisementFormData>(
    getInitialFormState()
  );

  useEffect(() => {
    if (advertisement) {
      const position: AdvertisementPosition =
        advertisement.position ?? "banner";
      setFormData({
        title: advertisement.title || "",
        description: advertisement.description || "",
        image: advertisement.image || "",
        link: advertisement.link || "",
        position,
        isActive: advertisement.isActive ?? true,
        startDate: advertisement.startDate
          ? new Date(advertisement.startDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        endDate: advertisement.endDate
          ? new Date(advertisement.endDate).toISOString().split("T")[0]
          : "",
        sortOrder: advertisement.sortOrder || 0,
      });
    } else {
      setFormData(getInitialFormState());
    }
  }, [advertisement]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append("image", file);

    setUploading(true);
    try {
      const { data } = await axiosInstance.post("/upload/upload", uploadFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFormData((prev) => ({ ...prev, image: data.url }));
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const imageRequired = formData.position !== "announcement";
    if (!formData.title || (imageRequired && !formData.image)) {
      toast.error(
        imageRequired ? "Title and image are required" : "Title is required"
      );
      return;
    }

    const success = advertisement
      ? await updateAdvertisement(advertisement._id, formData)
      : await createAdvertisement(formData);

    if (success) {
      toast.success(
        `Advertisement ${advertisement ? "updated" : "created"} successfully`
      );
      onClose();
    } else {
      toast.error(`Failed to ${advertisement ? "update" : "create"} advertisement`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {advertisement ? "Edit Advertisement" : "Create Advertisement"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image *
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
            {formData.image && (
              <img
                src={formData.image}
                alt="Preview"
                className="mt-2 h-32 object-cover rounded-lg"
               loading="lazy" decoding="async"/>
            )}
          </div>

          {/* Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link URL (Optional)
            </label>
            <input
              type="text"
              value={formData.link}
              onChange={(e) =>
                setFormData({ ...formData, link: e.target.value })
              }
              placeholder="/products/summer-sale or https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Examples: /products/123, /category/electronics, https://external-site.com
            </p>
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position
            </label>
            <select
              value={formData.position}
              onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                position: e.target.value as AdvertisementPosition,
              }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
            >
              <option value="hero">Hero (Main Banner)</option>
              <option value="banner">Banner (Mid-page)</option>
              <option value="popup">Popup</option>
              <option value="announcement">Announcement Bar (Top strip)</option>
              <option value="category-strip">Category Strip (Homepage/Listing)</option>
              <option value="sidebar">Sidebar (Product Listing)</option>
              <option value="pdp">Product Page (Cross-sell)</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
              />
            </div>
          </div>

          {/* Sort Order & Active */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sortOrder: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-[#002B5B] border-gray-300 rounded focus:ring-[#002B5B]"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Active
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-[#FFD600] text-[#333333] rounded-lg hover:bg-[#e6c100] transition-colors font-medium disabled:opacity-50"
            >
              {advertisement ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdvertisementModal;

