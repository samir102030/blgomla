import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import {
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";
import type { Product } from "../../types/product.type";

type ApprovalProduct = Omit<Product, "createdBy" | "store"> & {
  store?: Product["store"] | { _id: string; name?: string };
  createdBy?:
    | Product["createdBy"]
    | { _id: string; name?: string; email?: string; role?: string };
};

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const ProductApprovalsPage: React.FC = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ApprovalProduct[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/products/approvals", {
        params: { status: statusFilter },
      });
      setProducts(data.data || data || []);
    } catch (error) {
      console.error("Failed to load product approvals", error);
      toast.error(t("productApprovals.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [statusFilter]);

  const handleApprove = async (productId: string) => {
    try {
      await axiosInstance.post(`/products/${productId}/approve`);
      toast.success(t("productApprovals.approvedSuccess"));
      await fetchApprovals();
    } catch (error) {
      console.error("Approve failed", error);
      toast.error(t("productApprovals.approveFailed"));
    }
  };

  const handleReject = async (productId: string) => {
    const reason = prompt(t("productApprovals.rejectionReasonPrompt")) ?? "";
    try {
      await axiosInstance.post(`/products/${productId}/reject`, { reason });
      toast.success(t("productApprovals.rejectedSuccess"));
      await fetchApprovals();
    } catch (error) {
      console.error("Reject failed", error);
      toast.error(t("productApprovals.rejectFailed"));
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => {
      const storeName =
        typeof p.store === "object" && p.store
          ? ("storeName" in p.store ? p.store.storeName : p.store.name) || ""
          : String(p.store || "");
      return (
        (p.name || "").toLowerCase().includes(term) ||
        storeName.toLowerCase().includes(term) ||
        (p._id || "").toLowerCase().includes(term)
      );
    });
  }, [products, search]);

  const pendingCount = products.filter((p) => p.approvalStatus === "pending")
    .length;
  const approvedToday = products.filter(
    (p) =>
      p.approvalStatus === "approved" &&
      p.approvedAt &&
      new Date(p.approvedAt).toDateString() === new Date().toDateString()
  ).length;

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#333333]">
            {t("productApprovals.title")}
          </h1>
          <p className="text-[#9E9E9E]">
            {t("productApprovals.subtitle")}
          </p>
        </div>
        <button
          onClick={fetchApprovals}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border shadow-sm text-sm font-semibold hover:bg-gray-50"
          disabled={loading}
        >
          <ArrowPathIcon
            className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
          />
          {t("productApprovals.refresh")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-600">{t("productApprovals.pendingProducts")}</p>
          <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-600">{t("productApprovals.approvedToday")}</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">
            {approvedToday}
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-600">{t("productApprovals.queueSize")}</p>
          <p className="text-2xl sm:text-3xl font-bold text-[var(--brand-primary)]">
            {products.length}
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm">
        <div className="flex flex-wrap gap-3 items-center justify-between p-4 border-b">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1 w-full">
            <div className="relative flex-1 sm:min-w-[220px]">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={t("productApprovals.searchPlaceholder")}
                className="w-full border rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  {t("productApprovals.colProduct")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  {t("productApprovals.colStore")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  {t("productApprovals.colSubmittedBy")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  {t("productApprovals.colStatus")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  {t("productApprovals.colCreated")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                  {t("productApprovals.colActions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-gray-500 text-sm"
                  >
                    {t("productApprovals.noProducts")}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-gray-500 text-sm"
                  >
                    {t("productApprovals.loading")}
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        {product.name}
                      </div>
                      <div className="text-xs text-gray-500">{product._id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {typeof product.store === "object" && product.store
                        ? ("storeName" in product.store
                            ? product.store.storeName
                            : product.store.name) || "—"
                        : product.store || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {typeof product.createdBy === "string"
                        ? "Vendor"
                        : product.createdBy?.name || "Vendor"}
                      {typeof product.createdBy !== "string" &&
                        product.createdBy?.email && (
                          <div className="text-xs text-gray-500">
                            {product.createdBy.email}
                          </div>
                        )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${renderStatusBadge(
                          product.approvalStatus
                        )}`}
                      >
                        {product.approvalStatus || "pending"}
                      </span>
                      {product.approvalNotes && (
                        <div className="text-xs text-gray-500 mt-1">
                          {product.approvalNotes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {product.createdAt
                        ? new Date(product.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleApprove(product._id)}
                          disabled={product.approvalStatus === "approved"}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckIcon className="h-4 w-4" />
                          {t("productApprovals.approve")}
                        </button>
                        <button
                          onClick={() => handleReject(product._id)}
                          disabled={product.approvalStatus === "rejected"}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                        >
                          <XMarkIcon className="h-4 w-4" />
                          {t("productApprovals.reject")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductApprovalsPage;
