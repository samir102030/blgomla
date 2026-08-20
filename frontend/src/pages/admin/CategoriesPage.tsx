import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useCategoryStore } from "../../stores/category.store";
import type { Category } from "../../types/category.type";
import CategoryModal from "../../components/CategoryModal";
import ViewCategoryModal from "../../components/ViewCategoryModal";
import BulkCategoryUpload from "../../components/admin/BulkCategoryUpload";

const parentIdOf = (c: Category): string | null => {
  const parent = c.parentCategory;
  if (!parent) return null;
  return typeof parent === "string" ? parent : parent._id || null;
};

const CategoriesPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [viewingCategory, setViewingCategory] = useState<any>(null);
  // Which branches are open. Everything starts collapsed to roots: the point
  // of the tree is to make a deep catalogue readable, and a hundred rows dumped
  // flat is the thing it replaces.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Set when "add subcategory" is used, so the new category opens with its
  // parent already chosen instead of leaving it to be found in a long list.
  const [addingUnder, setAddingUnder] = useState<string>("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const {
    categories,
    loading,
    fetchCategories,
    safeDeleteCategory,
    updateCategory,
  } = useCategoryStore();

  useEffect(() => {
    fetchCategories({ includeHidden: true });
  }, [fetchCategories]);

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-[#009688]/10 text-[#009688]"
      : "bg-[#9E9E9E]/10 text-[#9E9E9E]";
  };

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, Category[]>();
    for (const c of categories) {
      if (!c) continue;
      const key = parentIdOf(c);
      map.set(key, [...(map.get(key) || []), c]);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)
      );
    }
    return map;
  }, [categories]);

  /**
   * The rows to draw, in the order they read.
   *
   * A search flattens the tree on purpose: a match three levels down is worth
   * showing on its own, and hiding it behind two collapsed parents would make
   * the search box useless for the deep categories it is most needed for.
   */
  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (term) {
      return categories
        .filter((c) => {
          if (!c) return false;
          return (
            (c.name || "").toLowerCase().includes(term) ||
            (c.nameAr || "").includes(searchTerm.trim()) ||
            (c.description || "").toLowerCase().includes(term)
          );
        })
        .map((category) => ({ category, depth: 0, childCount: 0 }));
    }

    const out: Array<{ category: Category; depth: number; childCount: number }> = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const category of childrenOf.get(parentId) || []) {
        const children = childrenOf.get(category._id) || [];
        out.push({ category, depth, childCount: children.length });
        if (expanded.has(category._id)) walk(category._id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [categories, childrenOf, expanded, searchTerm]);

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const expandAll = () =>
    setExpanded(new Set(categories.map((c) => c._id)));

  const handleDelete = async (categoryId: string) => {
    if (window.confirm(t("categories.confirmDelete"))) {
      await safeDeleteCategory(categoryId);
      fetchCategories({ includeHidden: true }); // Refresh the list
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setAddingUnder("");
    setModalOpen(true);
  };

  const handleAddSubcategory = (category: any) => {
    setEditingCategory(null);
    setAddingUnder(category._id);
    setExpanded((prev) => new Set(prev).add(category._id));
    setModalOpen(true);
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setAddingUnder("");
    setModalOpen(true);
  };

  const handleToggleStatus = async (category: any) => {
    await updateCategory(category._id, { isActive: !category.isActive });
    fetchCategories({ includeHidden: true }); // Refresh the list
  };

  // Whether the storefront menu lists it. Kept beside the live/deleted controls
  // rather than only on the visibility screen, because "why isn't it in the
  // menu?" gets asked while looking at this table.
  const handleToggleMenu = async (category: any) => {
    await updateCategory(category._id, {
      showInMenu: category.showInMenu === false,
    });
    fetchCategories({ includeHidden: true });
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingCategory(null);
    setAddingUnder("");
    fetchCategories({ includeHidden: true }); // Refresh after modal closes
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
      <div className="flex justify-center items-center h-64">{t("categories.loading")}</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#333333]">
            {t("categories.title")}
          </h1>
          <p className="text-[#9E9E9E]">
            {t("categories.subtitle")}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setBulkOpen((v) => !v)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-[#333333] hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium flex-1 sm:flex-none"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            {t("bulkCategory.button")}
          </button>
          <button
            onClick={handleAddCategory}
            className="bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg hover:bg-[#e6c100] transition-colors flex items-center justify-center gap-2 font-medium flex-1 sm:flex-none"
          >
            <PlusIcon className="h-4 w-4" />
            {t("categories.addCategory")}
          </button>
        </div>
      </div>

      {/* Bulk upload panel — collapsed until asked for, so the everyday view
          of the page stays the tree. */}
      {bulkOpen && <BulkCategoryUpload onDone={fetchCategories} />}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("categories.totalCategories")}</p>
              <p className="text-2xl font-bold text-gray-900">
                {categories.length}
              </p>
            </div>
            <div className="bg-[var(--brand-primary)]/10 p-3 rounded-full">
 <span className="text-2xl"></span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("categories.activeCategories")}</p>
              <p className="text-2xl font-bold text-green-600">
                {categories.filter((c) => c.isActive).length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
 <span className="text-2xl"></span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("categories.parentCategories")}</p>
              <p className="text-2xl font-bold text-[var(--brand-primary)]">
                {categories.filter((c) => !c.parentCategory).length}
              </p>
            </div>
            <div className="bg-[var(--brand-primary)]/10 p-3 rounded-full">
 <span className="text-2xl"></span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("categories.subcategories")}</p>
              <p className="text-2xl font-bold text-orange-600">
                {categories.filter((c) => c.parentCategory).length}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
 <span className="text-2xl"></span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("categories.searchPlaceholder")}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {!searchTerm && (
          <div className="flex gap-2 text-sm">
            <button
              onClick={expandAll}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              {t("categories.expandAll")}
            </button>
            <button
              onClick={() => setExpanded(new Set())}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              {t("categories.collapseAll")}
            </button>
          </div>
        )}
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("categories.colCategory")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("categories.colSlug")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("categories.colParent")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("categories.colProducts")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("categories.colStatus")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("categories.colMenu")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("categories.colActions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map(({ category, depth, childCount }) => (
                <tr key={category._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className="flex items-center gap-3"
                      style={{ paddingInlineStart: `${depth * 1.5}rem` }}
                    >
                      {childCount > 0 ? (
                        <button
                          onClick={() => toggleExpanded(category._id)}
                          aria-expanded={expanded.has(category._id)}
                          aria-label={category.name}
                          className="w-6 h-6 shrink-0 flex items-center justify-center rounded text-gray-500 hover:bg-gray-200"
                        >
                          {expanded.has(category._id) ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4 rtl:rotate-180" />
                          )}
                        </button>
                      ) : (
                        <span className="w-6 shrink-0" />
                      )}
                      {category.image && (
                        <img
                          className="h-10 w-10 rounded-lg object-cover shrink-0"
                          src={category.image}
                          alt={category.name}
                         loading="lazy" decoding="async"/>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {category.name}
                          {childCount > 0 && (
                            <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-gray-100 text-gray-600">
                              {childCount}
                            </span>
                          )}
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
                      {category.isActive ? t("categories.active") : t("categories.inactive")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={category.showInMenu !== false}
                        onChange={() => handleToggleMenu(category)}
                        className="h-4 w-4 accent-[var(--brand-primary)]"
                      />
                      {category.showInMenu !== false
                        ? t("categories.inMenu")
                        : t("categories.hiddenFromMenu")}
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAddSubcategory(category)}
                        className="text-gray-500 hover:text-gray-900"
                        title={t("categories.addSubcategory")}
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
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
                        title={category.isActive ? t("categories.deactivate") : t("categories.activate")}
                      >
 {category.isActive ? "" : ""}
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
      <div className="bg-white px-4 sm:px-6 py-3 rounded-lg shadow-sm border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-gray-700">
          {t("categories.showing")} <span className="font-medium">{rows.length}</span>{" "}
          {t("categories.of")} <span className="font-medium">{categories.length}</span>{" "}
          {t("categories.results")}
        </div>
        <div className="flex space-x-2">
          <button
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
            disabled
          >
            {t("categories.previous")}
          </button>
          <button className="px-3 py-1 bg-[var(--brand-accent)] text-white rounded text-sm">
            1
          </button>
          <button
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
            disabled
          >
            {t("categories.next")}
          </button>
        </div>
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        category={editingCategory}
        // The full list: the modal walks it to build the tree, and drops the
        // edited category along with everything beneath it.
        parentCategories={categories}
        defaultParentId={addingUnder}
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
