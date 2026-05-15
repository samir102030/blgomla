import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../../lib/axios";
import toast from "react-hot-toast";

interface Quotation {
  _id: string;
  bundleCollection?: { name: string; bundlePrice: number };
  customer: {
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
  items: Array<{
    product?: { name: string; price: number; images?: Array<{ url: string }> };
    quantity: number;
    unitPrice?: number;
  }>;
  collectionQuantity: number;
  estimatedTotal?: number;
  finalTotal?: number;
  status: string;
  adminNotes?: string;
  customerNotes?: string;
  validUntil?: string;
  createdAt: string;
  user?: { name: string; email: string };
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  reviewed: "bg-[var(--brand-primary)]/10 text-[var(--brand-accent)]",
  quoted: "bg-[var(--brand-primary)]/10 text-[var(--brand-accent)]",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};

const QuotationsPage: React.FC = () => {
  const { t } = useTranslation();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    status: "",
    adminNotes: "",
    finalTotal: "",
    validUntil: "",
  });
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 15 };
      if (statusFilter !== "all") params.status = statusFilter;
      const { data } = await axiosInstance.get("/quotations", { params });
      setQuotations(data.data || []);
      setTotalPages(data.pages || 1);
    } catch {
      toast.error("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await axiosInstance.get("/quotations/stats");
      setStats(data);
    } catch {
      // stats are optional
    }
  };

  useEffect(() => {
    fetchQuotations();
    fetchStats();
  }, [statusFilter, page]);

  const openDetail = (q: Quotation) => {
    setSelectedQuotation(q);
    setEditForm({
      status: q.status,
      adminNotes: q.adminNotes || "",
      finalTotal: q.finalTotal?.toString() || "",
      validUntil: q.validUntil ? new Date(q.validUntil).toISOString().split("T")[0] : "",
    });
  };

  const handleUpdate = async () => {
    if (!selectedQuotation) return;
    setUpdating(true);
    try {
      const payload: Record<string, any> = {
        status: editForm.status,
        adminNotes: editForm.adminNotes,
      };
      if (editForm.finalTotal) payload.finalTotal = Number(editForm.finalTotal);
      if (editForm.validUntil) payload.validUntil = editForm.validUntil;

      await axiosInstance.put(`/quotations/${selectedQuotation._id}`, payload);
      toast.success("Quotation updated");
      setSelectedQuotation(null);
      fetchQuotations();
      fetchStats();
    } catch {
      toast.error("Failed to update quotation");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this quotation?")) return;
    try {
      await axiosInstance.delete(`/quotations/${id}`);
      toast.success("Quotation deleted");
      fetchQuotations();
      fetchStats();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const getStatusCount = (status: string) => {
    if (!stats?.stats) return 0;
    const found = stats.stats.find((s: any) => s._id === status);
    return found?.count || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            📋 {t("Quotation Management")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("Review and respond to customer quotation requests")}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
          <p className="text-xs text-gray-500">{t("Total Quotations")}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {["pending", "reviewed", "quoted", "accepted", "rejected", "expired"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s === statusFilter ? "all" : s)}
            className={`p-3 rounded-xl border text-center transition-all ${
              statusFilter === s
                ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-lg font-bold text-gray-900">{getStatusCount(s)}</p>
            <p className="text-xs text-gray-500 capitalize">{s}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("Customer")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("Bundle")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("Qty")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("Estimated")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("Status")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("Date")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    No quotations found
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{q.customer.name}</p>
                      <p className="text-xs text-gray-500">{q.customer.email}</p>
                      <p className="text-xs text-gray-400">{q.customer.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{q.bundleCollection?.name || "Custom"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{q.collectionQuantity}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        EGP {q.estimatedTotal?.toLocaleString() || "—"}
                      </p>
                      {q.finalTotal && (
                        <p className="text-xs text-green-600 font-medium">
                          Final: EGP {q.finalTotal.toLocaleString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[q.status] || "bg-gray-100 text-gray-700"}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDetail(q)}
                          className="px-3 py-1.5 text-xs font-medium bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded-lg hover:bg-[var(--brand-primary)]/10 transition-colors"
                        >
                          {t("Review")}
                        </button>
                        <button
                          onClick={() => handleDelete(q._id)}
                          className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail/Edit Modal */}
      {selectedQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border mx-4">
            {/* Header */}
            <div className="px-4 sm:px-6 py-5 border-b bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Quotation #{selectedQuotation._id.slice(-8)}
                </h2>
                <p className="text-xs text-gray-500">
                  {new Date(selectedQuotation.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedQuotation(null)}
                className="p-2 hover:bg-white rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Customer</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedQuotation.customer.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Email</p>
                  <p className="text-sm text-gray-700">{selectedQuotation.customer.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Phone</p>
                  <p className="text-sm text-gray-700">{selectedQuotation.customer.phone}</p>
                </div>
                {selectedQuotation.customer.company && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Company</p>
                    <p className="text-sm text-gray-700">{selectedQuotation.customer.company}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Items ({selectedQuotation.items.length})</h3>
                <div className="space-y-2">
                  {selectedQuotation.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      {item.product?.images?.[0]?.url && (
                        <img
                          src={item.product.images[0].url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23f3f4f6'/><text x='32' y='38' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%239ca3af'>No image</text></svg>"; }}
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.product?.name || "Product"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Qty: {item.quantity} × EGP {item.unitPrice?.toLocaleString() || item.product?.price?.toLocaleString() || "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Notes */}
              {selectedQuotation.customerNotes && (
                <div className="bg-amber-50 p-3 rounded-xl">
                  <p className="text-xs font-medium text-amber-800 mb-1">Customer Notes:</p>
                  <p className="text-sm text-amber-700">{selectedQuotation.customerNotes}</p>
                </div>
              )}

              {/* Pricing */}
              <div className="flex gap-4 bg-[var(--brand-primary)]/10 p-4 rounded-xl">
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Estimated Total</p>
                  <p className="text-lg font-bold text-gray-900">
                    EGP {selectedQuotation.estimatedTotal?.toLocaleString() || "—"}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Quantity</p>
                  <p className="text-lg font-bold text-gray-900">{selectedQuotation.collectionQuantity}×</p>
                </div>
              </div>

              {/* Admin Response Form */}
              <div className="border-t pt-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-700">Admin Response</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)]"
                    >
                      <option value="pending">Pending</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="quoted">Quoted</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Final Total (EGP)</label>
                    <input
                      type="number"
                      value={editForm.finalTotal}
                      onChange={(e) => setEditForm({ ...editForm, finalTotal: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)]"
                      placeholder="Set final price"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={editForm.validUntil}
                    onChange={(e) => setEditForm({ ...editForm, validUntil: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Admin Notes</label>
                  <textarea
                    value={editForm.adminNotes}
                    onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] resize-none"
                    placeholder="Internal notes or response to customer..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedQuotation(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  className="flex-1 px-4 py-2.5 bg-[var(--brand-accent)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--brand-accent)] transition-colors disabled:opacity-60"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationsPage;
