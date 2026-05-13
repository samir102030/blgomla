import React, { useState, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useCategoryStore } from "../../stores/category.store";
import CategoryModal from "../../components/CategoryModal";
import ViewCategoryModal from "../../components/ViewCategoryModal";

const CategoriesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [viewingCategory, setViewingCategory] = useState<any>(null);
  const {
    categories,
    loading,
    fetchCategories,
    safeDeleteCategory,
    updateCategory,
  } = useCategoryStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-[#009688]/10 text-[#009688]"
      : "bg-[#9E9E9E]/10 text-[#9E9E9E]";
  };

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description &&
        category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (categoryId: string) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      await safeDeleteCategory(categoryId);
      fetchCategories(); // Refresh the list
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setModalOpen(true);
  };

  const handleToggleStatus = async (category: any) => {
    await updateCategory(category._id, { isActive: !category.isActive });
    fetchCategories(); // Refresh the list
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingCategory(null);
    fetchCategories(); // Refresh after modal closes
  };

  const handleViewCategory = (category: any) => {
    setViewingCategory(category);
    setViewModalOpen(true);
  };

  const handleViewModalClose = () => {
    setViewModalOpen(false);
    setViewingCategory(null);
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">
            Categories Management
          </h1>
          <p className="text-[#9E9E9E]">
            Organize your products into categories
          </p>
        </div>
        <button
          onClick={handleAddCategory}
          className="bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg hover:bg-[#e6c100] transition-colors flex items-center gap-2 font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Categories</p>
              <p className="text-2xl font-bold text-gray-900">
                {categories.length}
              </p>
            </div>
            <div className="bg-[var(--brand-primary)]/10 p-3 rounded-full">
              <span className="text-2xl">📁</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Categories</p>
              <p className="text-2xl font-bold text-green-600">
                {categories.filter((c) => c.isActive).length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Parent Categories</p>
              <p className="text-2xl font-bold text-[var(--brand-primary)]">
                {categories.filter((c) => !c.parentCategory).length}
              </p>
            </div>
            <div className="bg-[var(--brand-primary)]/10 p-3 rounded-full">
              <span className="text-2xl">🏷️</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Subcategories</p>
              <p className="text-2xl font-bold text-orange-600">
                {categories.filter((c) => c.parentCategory).length}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <span className="text-2xl">📂</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCategories.map((category) => (
                <tr key={category._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {category.image && (
                        <img
                          className="h-10 w-10 rounded-lg object-cover mr-4"
                          src={category.image}
                          alt={category.name}
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {category.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {category.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.slug || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {typeof category.parentCategory === "object" &&
                      category.parentCategory?.name
                      ? category.parentCategory.name
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.productCount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        category.isActive
                      )}`}
                    >
                      {category.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewCategory(category)}
                        className="text-[var(--brand-primary)] hover:text-[var(--brand-accent)]"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(category)}
                        className={`hover:text-gray-900 ${category.isActive ? "text-green-600" : "text-gray-600"
                          }`}
                        title={category.isActive ? "Deactivate" : "Activate"}
                      >
                        {category.isActive ? "✓" : "✗"}
                      </button>
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDelete(category._id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="bg-white px-6 py-3 rounded-lg shadow-sm border flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">1</span> to{" "}
          <span className="font-medium">{filteredCategories.length}</span> of{" "}
          <span className="font-medium">{filteredCategories.length}</span>{" "}
          results
        </div>
        <div className="flex space-x-2">
          <button
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
            disabled
          >
            Previous
          </button>
          <button className="px-3 py-1 bg-[var(--brand-accent)] text-white rounded text-sm">
            1
          </button>
          <button
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
            disabled
          >
            Next
          </button>
        </div>
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        category={editingCategory}
        parentCategories={categories.filter(
          (c) => c._id !== editingCategory?._id
        )}
      />

      {/* View Category Modal */}
      <ViewCategoryModal
        isOpen={viewModalOpen}
        onClose={handleViewModalClose}
        category={viewingCategory}
      />
    </div>
  );
};

export default CategoriesPage;
