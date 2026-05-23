import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../../lib/axios";

interface AuditEntry {
  _id: string;
  actor: { name?: string; email?: string; role?: string };
  action: string;
  resource: string;
  resourceId?: string;
  meta: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  "order.status_changed": "bg-blue-100 text-blue-800",
  "order.cancelled": "bg-red-100 text-red-800",
  "order.deleted": "bg-red-100 text-red-800",
  "product.approved": "bg-green-100 text-green-800",
  "product.rejected": "bg-red-100 text-red-800",
  "product.deleted": "bg-red-100 text-red-800",
  "product.archived": "bg-amber-100 text-amber-800",
  "product.restored": "bg-green-100 text-green-800",
  "product.stock_updated": "bg-purple-100 text-purple-800",
  "product.sale_toggled": "bg-amber-100 text-amber-800",
  "product.featured_toggled": "bg-indigo-100 text-indigo-800",
  "coupon.created": "bg-green-100 text-green-800",
  "coupon.deleted": "bg-red-100 text-red-800",
  "coupon.status_toggled": "bg-amber-100 text-amber-800",
  "shipping.updated": "bg-purple-100 text-purple-800",
};

const RESOURCES = ["order", "product", "coupon", "shipping"];

const AuditLogPage: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    resource: "",
    action: "",
    from: "",
    to: "",
  });

  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (filters.resource) params.resource = filters.resource;
      if (filters.action) params.action = filters.action;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const res = await axiosInstance.get<{ data: AuditEntry[]; total: number }>(
        "/audit-logs",
        { params }
      );
      setLogs(res.data.data);
      setTotal(res.data.total);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">{t("Audit Log")}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {t("A record of every admin and staff action.")}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-wrap gap-3">
        <select
          value={filters.resource}
          onChange={(e) => { setFilters((f) => ({ ...f, resource: e.target.value })); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
        >
          <option value="">{t("All resources")}</option>
          {RESOURCES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder={t("Filter by action…")}
          value={filters.action}
          onChange={(e) => { setFilters((f) => ({ ...f, action: e.target.value })); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm w-48"
        />

        <input
          type="date"
          value={filters.from}
          onChange={(e) => { setFilters((f) => ({ ...f, from: e.target.value })); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
        />
        <span className="self-center text-[var(--text-muted)] text-sm">→</span>
        <input
          type="date"
          value={filters.to}
          onChange={(e) => { setFilters((f) => ({ ...f, to: e.target.value })); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
        />

        <button
          onClick={() => { setFilters({ resource: "", action: "", from: "", to: "" }); setPage(1); }}
          className="px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)] rounded-lg"
        >
          {t("Clear")}
        </button>

        <span className="ml-auto self-center text-sm text-[var(--text-muted)]">
          {total.toLocaleString()} {t("entries")}
        </span>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg)] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">{t("Time")}</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">{t("Actor")}</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">{t("Action")}</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">{t("Resource")}</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">{t("Details")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    {t("Loading…")}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    {t("No audit entries found.")}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-[var(--bg)] transition-colors">
                    <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--text)]">{log.actor.name || "—"}</div>
                      <div className="text-xs text-[var(--text-muted)]">{log.actor.role}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--text)]">{log.resource}</span>
                      {log.resourceId && (
                        <div className="text-xs text-[var(--text-muted)] font-mono truncate max-w-[120px]">
                          {log.resourceId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <pre className="text-xs text-[var(--text-muted)] whitespace-pre-wrap break-all">
                        {JSON.stringify(log.meta, null, 0)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg disabled:opacity-40 hover:bg-[var(--bg)]"
            >
              {t("Previous")}
            </button>
            <span className="text-sm text-[var(--text-muted)]">
              {t("Page")} {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg disabled:opacity-40 hover:bg-[var(--bg)]"
            >
              {t("Next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogPage;
