import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  ArrowUpTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useStudentStore, type StudentCategory } from "../../../stores/student.store";
import BulkStudentUpload from "../../../components/admin/BulkStudentUpload";
import StudentCategoryModal from "../../../components/admin/StudentCategoryModal";

/**
 * The student section's departments, laid out as the catalogue's own category
 * page is: stats, search, and a tree that opens a branch at a time.
 *
 * The tree is the point. A department's meaning is its position — "Kits" under
 * "Lab" is a different thing from "Kits" at the top — and a flat table hides
 * exactly that. Everything starts collapsed to roots, because a hundred rows
 * dumped flat is the thing the tree replaces.
 */

const parentIdOf = (c: StudentCategory): string | null =>
  c.parentCategory ? String(c.parentCategory) : null;

const StudentsCategoriesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const name = (c?: { name?: string; nameAr?: string } | null) =>
    (isAr && c?.nameAr ? c.nameAr : c?.name) || "—";

  const {
    catalogCategories,
    loading,
    saving,
    fetchCatalogCategories,
    saveCategory,
    deleteCategory,
  } = useStudentStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudentCategory | null>(null);
  const [addingUnder, setAddingUnder] = useState("");

  useEffect(() => {
    fetchCatalogCategories();
  }, [fetchCatalogCategories]);

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, StudentCategory[]>();
    for (const c of catalogCategories) {
      const key = parentIdOf(c);
      map.set(key, [...(map.get(key) || []), c]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
    }
    return map;
  }, [catalogCategories]);

  /**
   * A search flattens the tree on purpose: a match three levels down is worth
   * showing on its own, and hiding it behind two collapsed parents would make
   * the search box useless for the departments it is most needed for.
   */
  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (term) {
      return catalogCategories
        .filter(
          (c) =>
            (c.name || "").toLowerCase().includes(term) ||
            (c.nameAr || "").includes(searchTerm.trim()),
        )
        .map((category) => ({ category, depth: 0, childCount: 0 }));
    }

    const out: Array<{ category: StudentCategory; depth: number; childCount: number }> = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const category of childrenOf.get(parentId) || []) {
        const children = childrenOf.get(category._id) || [];
        out.push({ category, depth, childCount: children.length });
        if (expanded.has(category._id)) walk(category._id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [catalogCategories, childrenOf, expanded, searchTerm]);

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openNew = (under = "") => {
    setEditing(null);
    setAddingUnder(under);
    if (under) setExpanded((prev) => new Set(prev).add(under));
    setModalOpen(true);
  };

  const openEdit = (category: StudentCategory) => {
    setEditing(category);
    setAddingUnder("");
    setModalOpen(true);
  };

  const onDelete = async (category: StudentCategory) => {
    if (!window.confirm(t("Remove this department?") as string)) return;
    if (await deleteCategory(category._id)) toast.success(t("Department removed."));
  };

  const toggleActive = async (category: StudentCategory) => {
    await saveCategory({ _id: category._id, active: !category.active });
  };

  const roots = catalogCategories.filter((c) => !c.parentCategory).length;
  const active = catalogCategories.filter((c) => c.active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#333333]">{t("Departments")}</h1>
          <p className="text-[#9E9E9E]">
            {t("The student section's own departments. Products are filed under them.")}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setBulkOpen((v) => !v)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-[#333333] hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium flex-1 sm:flex-none"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            {t("Bulk upload")}
          </button>
          <button
            onClick={() => openNew()}
            className="bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg hover:bg-[#e6c100] transition-colors flex items-center justify-center gap-2 font-medium flex-1 sm:flex-none"
          >
            <PlusIcon className="h-4 w-4" />
            {t("Add department")}
          </button>
        </div>
      </div>

      {/* Collapsed until asked for, so the everyday view of the page is the tree. */}
      {bulkOpen && <BulkStudentUpload kind="categories" onDone={fetchCatalogCategories} />}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
 [t("Departments"), catalogCategories.length, "text-gray-900", ""],
 [t("Shown"), active, "text-green-600", ""],
 [t("Top level"), roots, "text-[var(--brand-primary)]", ""],
 [t("Nested"), catalogCategories.length - roots, "text-orange-600", ""],
        ].map(([label, value, tone, icon]) => (
          <div key={String(label)} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{label}</p>
                <p className={`text-2xl font-bold ${tone}`}>{value}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-full">
                <span className="text-2xl">{icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("Search departments") as string}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {!searchTerm && (
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setExpanded(new Set(catalogCategories.map((c) => c._id)))}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              {t("Expand all")}
            </button>
            <button
              onClick={() => setExpanded(new Set())}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              {t("Collapse all")}
            </button>
          </div>
        )}
      </div>

      {/* Tree */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {[t("Department"), t("Slug"), t("Products"), t("Order"), t("Status"), t("Actions")].map(
                  (h) => (
                    <th
                      key={String(h)}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ),
                )}
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
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {name(category)}
                          {childCount > 0 && (
                            <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-gray-100 text-gray-600">
                              {childCount}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {isAr ? category.descriptionAr : category.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.slug || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.productCount ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.order ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        category.active
                          ? "bg-[#009688]/10 text-[#009688]"
                          : "bg-[#9E9E9E]/10 text-[#9E9E9E]"
                      }`}
                    >
                      {category.active ? t("Shown") : t("Hidden")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openNew(category._id)}
                        className="text-gray-500 hover:text-gray-900"
                        title={t("Add a department under this one") as string}
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(category)}
                        disabled={saving}
                        className={`hover:text-gray-900 ${
                          category.active ? "text-green-600" : "text-gray-600"
                        }`}
                        title={(category.active ? t("Hide") : t("Show")) as string}
                      >
 {category.active ? "" : ""}
                      </button>
                      <button
                        onClick={() => openEdit(category)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(category)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    {t("No departments yet. The section needs at least one before a product can be filed.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white px-4 sm:px-6 py-3 rounded-lg shadow-sm border text-sm text-gray-700">
        {t("Showing")} <span className="font-medium">{rows.length}</span> {t("of")}{" "}
        <span className="font-medium">{catalogCategories.length}</span>
      </div>

      <StudentCategoryModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setAddingUnder("");
        }}
        category={editing}
        categories={catalogCategories}
        defaultParentId={addingUnder}
      />
    </div>
  );
};

export default StudentsCategoriesPage;
