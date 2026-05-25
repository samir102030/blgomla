import React, { useState, useEffect } from "react";
import { XMarkIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { useCategoryStore } from "../stores/category.store";
import type { Category } from "../types/category.type";
import { axiosInstance } from "../lib/axios";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category;
  parentCategories?: Category[];
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  parentCategories = [],
}) => {
  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    description: "",
    descriptionAr: "",
    image: "",
    parentCategory: "",
    metaTitle: "",
    metaDescription: "",
    sortOrder: 0,
    isActive: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const { t } = useTranslation();
  const { createCategory, updateCategory, loading } = useCategoryStore();

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        nameAr: (category as any).nameAr || "",
        description: category.description || "",
        descriptionAr: (category as any).descriptionAr || "",
        image: category.image || "",
        parentCategory:
          typeof category.parentCategory === "object"
            ? category.parentCategory?._id || ""
            : category.parentCategory || "",
        metaTitle: category.metaTitle || "",
        metaDescription: category.metaDescription || "",
        sortOrder: category.sortOrder || 0,
        isActive: category.isActive,
      });
      setImagePreview(category.image || "");
    } else {
      setFormData({
        name: "",
        nameAr: "",
        description: "",
        descriptionAr: "",
        image: "",
        parentCategory: "",
        metaTitle: "",
        metaDescription: "",
        sortOrder: 0,
        isActive: true,
      });
      setImagePreview("");
    }
    setImageFile(null);
  }, [category, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return formData.image;

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("image", imageFile);

      const response = await axiosInstance.post(
        "/upload/upload",
        formDataUpload,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const result = response.data;
      if (result.success) {
        return result.url;
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const imageUrl = await uploadImage();
    if (imageFile && !imageUrl) {
      alert(t("categories.failedUpload"));
      return;
    }

    const submitData = {
      ...formData,
      image: imageUrl || formData.image,
      parentCategory: formData.parentCategory || undefined,
    };

    try {
      if (category) {
        await updateCategory(category._id, submitData);
      } else {
        await createCategory(submitData);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save category:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">
            {category ? t("categories.editCategory") : t("categories.addNewCategory")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("categories.categoryNameEn")}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t("categories.categoryNameEn")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم الفئة (عربي)
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.nameAr}
                onChange={(e) =>
                  setFormData({ ...formData, nameAr: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="أدخل اسم الفئة"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("categories.parentCategory")}
              </label>
              <select
                value={formData.parentCategory}
                onChange={(e) =>
                  setFormData({ ...formData, parentCategory: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t("categories.noParent")}</option>
                {parentCategories
                  .filter((cat) => cat._id !== category?._id)
                  .map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("categories.descriptionEn")}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t("Description")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الوصف (عربي)
              </label>
              <textarea
                dir="rtl"
                value={formData.descriptionAr}
                onChange={(e) =>
                  setFormData({ ...formData, descriptionAr: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="أدخل وصف الفئة"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("categories.metaTitle")}
              </label>
              <input
                type="text"
                value={formData.metaTitle}
                onChange={(e) =>
                  setFormData({ ...formData, metaTitle: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t("categories.metaTitlePlaceholder")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("categories.sortOrder")}
              </label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sortOrder: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("categories.metaDescription")}
            </label>
            <textarea
              value={formData.metaDescription}
              onChange={(e) =>
                setFormData({ ...formData, metaDescription: e.target.value })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("categories.metaDescPlaceholder")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("categories.categoryImage")}
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="category-image"
              />
              <label
                htmlFor="category-image"
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200"
              >
                <PhotoIcon className="h-5 w-5 mr-2" />
                {t("categories.chooseImage")}
              </label>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-16 w-16 object-cover rounded-lg"
                 loading="lazy" decoding="async"/>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              {t("Active")}
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading || uploading
                ? t("categories.saving")
                : category
                ? t("categories.update")
                : t("Create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
