import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { Category } from "../types/category.type";

interface ViewCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
}

const ViewCategoryModal: React.FC<ViewCategoryModalProps> = ({
  isOpen,
  onClose,
  category,
}) => {
  if (!isOpen || !category) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">View Category Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Category Image */}
          <div className="flex justify-center">
            {category.image ? (
              <img
                src={category.image}
                alt={category.name}
                className="h-32 w-32 object-cover rounded-lg border"
               loading="lazy" decoding="async"/>
            ) : (
              <div className="h-32 w-32 bg-gray-100 rounded-lg flex items-center justify-center border">
                <span className="text-gray-400 text-sm">No Image</span>
              </div>
            )}
          </div>

          {/* Category Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {category.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    category.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {category.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {category.slug || "N/A"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Category
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {typeof category.parentCategory === "object" &&
                category.parentCategory?.name
                  ? category.parentCategory.name
                  : "None (Top Level)"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort Order
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {category.sortOrder || 0}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Products Count
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {category.productCount || 0}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[80px]">
              {category.description || "No description provided"}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta Title
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {category.metaTitle || "N/A"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta Description
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {category.metaDescription || "N/A"}
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Created At
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {category.createdAt
                  ? new Date(category.createdAt).toLocaleString()
                  : "N/A"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Updated At
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {category.updatedAt
                  ? new Date(category.updatedAt).toLocaleString()
                  : "N/A"}
              </div>
            </div>
          </div>

          {/* Category ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category ID
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm">
              {category._id}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewCategoryModal;
