import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useStudentStore, type StudentProduct } from "../../../stores/student.store";
import BulkStudentUpload from "../../../components/admin/BulkStudentUpload";
import StudentProductModal from "../../../components/admin/StudentProductModal";

/**
 * The section's products, laid out as the catalogue's own products page is.
 *
 * They live in the shop's product collection with the section's mark on them,
 * which is why they can be added to a cart, charged, counted against stock and
 * shipped without any of that machinery learning a second kind of product.
 * Nothing on the storefront lists them: product queries default to the public
 * catalogue, and this section never asks otherwise.
 */

const StudentsProductsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const name = (p?: { name?: string; nameAr?: string } | null) =>
    (isAr && p?.nameAr ? p.nameAr : p?.name) || "—";

  const {
    catalogProducts,
    catalogTotal,
    catalogPages,
    catalogCategories,
    loading,
    fetchCatalogProducts,
    fetchCatalogCategories,
    deleteProduct,
  } = useStudentStore();

  const [filter, setFilter] = useState({ search: "", category: "", page: 1 });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudentProduct | null>(null);

  useEffect(() => {
    fetchCatalogCategories();
  }, [fetchCatalogCategories]);

  const reload = () =>
    fetchCatalogProducts({
      page: filter.page,
      ...(filter.search ? { search: filter.search } : {}),
      ...(filter.category ? { category: filter.category } : {}),
    });

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  /** The tree, flattened, so the filter reads as the tree it is. */
  const options = useMemo(() => {
    const byParent = new Map<string, typeof catalogCategories>();
    for (const c of catalogCategories) {
      const key = c.parentCategory ? String(c.parentCategory) : "root";
      byParent.set(key, [...(byParent.get(key) || []), c]);
    }
    const out: Array<{ _id: string; label: string }> = [];
    const walk = (key: string, depth: number) => {
      for (const node of (byParent.get(key) || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
        out.push({ _id: node._id, label: `${"— ".repeat(depth)}${(isAr && node.nameAr) || node.name}` });
        walk(String(node._id), depth + 1);
      }
    };
    walk("root", 0);
    return out;
  }, [catalogCategories, isAr]);

  const onDelete = async (product: StudentProduct) => {
    if (!window.confirm(t("Remove this product?") as string)) return;
    if (await deleteProduct(product._id)) {
      toast.success(t("Product removed."));
      reload();
    }
  };

  const shown = catalogProducts.filter((p) => p.isActive !== false).length;
  const outOfStock = catalogProducts.filter((p) => !p.stock).length;
  const unpriced = catalogProducts.filter((p) => !p.price).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#333333]">{t("Products")}</h1>
          <p className="text-[#9E9E9E]">
            {t("The section's own products. They exist here and nowhere else on the shop.")}
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
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg hover:bg-[#e6c100] transition-colors flex items-center justify-center gap-2 font-medium flex-1 sm:flex-none"
          >
            <PlusIcon className="h-4 w-4" />
            {t("Add product")}
          </button>
        </div>
      </div>

      {bulkOpen && <BulkStudentUpload kind="products" onDone={reload} />}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
 [t("Products"), catalogTotal, "text-gray-900", ""],
 [t("Shown"), shown, "text-green-600", ""],
 [t("Out of stock"), outOfStock, "text-orange-600", ""],
 [t("Unpriced"), unpriced, "text-red-600", ""],
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

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t("Search products") as string}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value, page: 1 })}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg sm:max-w-[260px] focus:ring-2 focus:ring-[var(--brand-primary)]"
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value, page: 1 })}
          >
            <option value="">{t("All departments")}</option>
            {options.map((o) => (
              <option key={o._id} value={o._id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {[t("Product"), t("Department"), t("Price"), t("Stock"), t("Status"), t("Actions")].map(
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
              {catalogProducts.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.images?.[0]?.url || "/placeholder.png"}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover shrink-0 bg-gray-100"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {name(p)}
                        </div>
                        {p.sku && <div className="text-xs text-gray-500" dir="ltr">{p.sku}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {typeof p.studentCategory === "object" && p.studentCategory
                      ? name(p.studentCategory)
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {p.price ? `${p.price} EGP` : <span className="text-red-600">{t("Unpriced")}</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.stock ?? 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        p.isActive !== false
                          ? "bg-[#009688]/10 text-[#009688]"
                          : "bg-[#9E9E9E]/10 text-[#9E9E9E]"
                      }`}
                    >
                      {p.isActive !== false ? t("Shown") : t("Hidden")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditing(p);
                          setModalOpen(true);
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => onDelete(p)} className="text-red-600 hover:text-red-900">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!catalogProducts.length && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    {catalogCategories.length
                      ? t("No products yet.")
                      : t("Add a department first — a product needs somewhere to sit.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="bg-white px-4 sm:px-6 py-3 rounded-lg shadow-sm border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-gray-700">
          {t("Showing")} <span className="font-medium">{catalogProducts.length}</span> {t("of")}{" "}
          <span className="font-medium">{catalogTotal}</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter({ ...filter, page: filter.page - 1 })}
            disabled={filter.page <= 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-40"
          >
            {t("Previous")}
          </button>
          <span className="px-3 py-1 bg-[var(--brand-accent)] text-white rounded text-sm">
            {filter.page}
          </span>
          <button
            onClick={() => setFilter({ ...filter, page: filter.page + 1 })}
            disabled={filter.page >= catalogPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-40"
          >
            {t("Next")}
          </button>
        </div>
      </div>

      <StudentProductModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        product={editing}
        categories={catalogCategories}
        onSaved={reload}
      />
    </div>
  );
};

export default StudentsProductsPage;
