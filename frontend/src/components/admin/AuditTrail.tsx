import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../../lib/axios";

export interface AuditEntry {
  _id: string;
  actor: { userId?: string; name?: string; email?: string; role?: string };
  target?: { userId?: string; name?: string; email?: string; role?: string };
  action: string;
  resource: string;
  resourceId?: string;
  status?: "success" | "failure";
  severity?: "info" | "warning" | "critical";
  category?: string;
  changes?: { field: string; from: unknown; to: unknown }[];
  meta?: Record<string, unknown>;
  method?: string;
  path?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

const RESOURCES = ["user", "auth", "order", "product", "coupon", "shipping"];
const SEVERITIES = ["info", "warning", "critical"];
const STATUSES = ["success", "failure"];

const SEVERITY_STYLE: Record<string, string> = {
  info: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};
const STATUS_STYLE: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  failure: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const parseDevice = (ua?: string): string => {
  if (!ua) return "";
  const browser = /Edg/.test(ua)
    ? "Edge"
    : /OPR|Opera/.test(ua)
    ? "Opera"
    : /Chrome|CriOS/.test(ua)
    ? "Chrome"
    : /Firefox|FxiOS/.test(ua)
    ? "Firefox"
    : /Safari/.test(ua)
    ? "Safari"
    : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Mac OS X|Macintosh/.test(ua)
    ? "macOS"
    : /Linux/.test(ua)
    ? "Linux"
    : "";
  return os ? `${browser} · ${os}` : browser;
};

const fmt = (v: unknown): string => {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

interface AuditTrailProps {
  /** Restrict to one user's activity (matches actor OR target). */
  userId?: string;
  /** Show the filter bar + export (default true). */
  showFilters?: boolean;
  /** Compact expandable list (for the per-user modal) instead of the full table. */
  compact?: boolean;
  pageSize?: number;
}

const Badge: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = "",
  children,
}) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);

const EntryDetails: React.FC<{ entry: AuditEntry }> = ({ entry }) => {
  const { t } = useTranslation();
  const metaEntries = Object.entries(entry.meta || {});
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Field label={t("Time")} value={new Date(entry.createdAt).toLocaleString()} />
        <Field label={t("Action")} value={entry.action} mono />
        <Field
          label={t("Actor")}
          value={`${entry.actor?.name || "—"}${
            entry.actor?.email ? ` (${entry.actor.email})` : ""
          }`}
        />
        {entry.target?.name || entry.target?.email ? (
          <Field
            label={t("Target")}
            value={`${entry.target?.name || "—"}${
              entry.target?.email ? ` (${entry.target.email})` : ""
            }`}
          />
        ) : null}
        <Field label={t("Resource")} value={`${entry.resource}${entry.resourceId ? ` · ${entry.resourceId}` : ""}`} mono />
        <Field label={t("Request")} value={[entry.method, entry.path].filter(Boolean).join(" ") || "—"} mono />
        <Field label={t("Device")} value={parseDevice(entry.userAgent) || "—"} />
        <Field label={t("IP address")} value={entry.ip || "—"} mono />
      </div>

      {entry.changes && entry.changes.length > 0 && (
        <div>
          <div className="font-semibold text-[var(--text)] mb-1">{t("Changes")}</div>
          <div className="rounded-lg border border-[var(--border)] overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">{t("Field")}</th>
                  <th className="px-3 py-1.5 text-left font-medium">{t("Before")}</th>
                  <th className="px-3 py-1.5 text-left font-medium">{t("After")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {entry.changes.map((c) => (
                  <tr key={c.field}>
                    <td className="px-3 py-1.5 font-mono text-[var(--text)]">{c.field}</td>
                    <td className="px-3 py-1.5 text-red-600 dark:text-red-400 line-through break-all">{fmt(c.from)}</td>
                    <td className="px-3 py-1.5 text-emerald-600 dark:text-emerald-400 break-all">{fmt(c.to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {metaEntries.length > 0 && (
        <div>
          <div className="font-semibold text-[var(--text)] mb-1">{t("Details")}</div>
          <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
            {metaEntries.map(([k, v]) => (
              <div key={k} className="flex gap-3 px-3 py-1.5 text-xs">
                <span className="text-[var(--text-muted)] font-mono min-w-[120px]">{k}</span>
                <span className="text-[var(--text)] break-all">{fmt(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div>
    <div className="text-[var(--text-muted)] text-xs">{label}</div>
    <div className={`text-[var(--text)] break-all ${mono ? "font-mono text-xs" : ""}`}>
      {value}
    </div>
  </div>
);

const AuditTrail: React.FC<AuditTrailProps> = ({
  userId,
  showFilters = true,
  compact = false,
  pageSize = 50,
}) => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    resource: "",
    severity: "",
    status: "",
    q: "",
    from: "",
    to: "",
  });

  const activeParams = useMemo(() => {
    const p: Record<string, string | number> = {};
    if (userId) p.userId = userId;
    if (filters.resource) p.resource = filters.resource;
    if (filters.severity) p.severity = filters.severity;
    if (filters.status) p.status = filters.status;
    if (filters.q) p.q = filters.q;
    if (filters.from) p.from = filters.from;
    if (filters.to) p.to = filters.to;
    return p;
  }, [userId, filters]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<{ data: AuditEntry[]; total: number }>(
        "/audit-logs",
        { params: { ...activeParams, page, limit: pageSize } }
      );
      setLogs(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeParams, page, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const setFilter = (patch: Partial<typeof filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await axiosInstance.get("/audit-logs", {
        params: { ...activeParams, format: "csv" },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      //
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  const SeverityBadge = ({ s }: { s?: string }) =>
    s ? <Badge className={SEVERITY_STYLE[s] || SEVERITY_STYLE.info}>{t(s)}</Badge> : null;
  const StatusBadge = ({ s }: { s?: string }) =>
    s && s !== "success" ? <Badge className={STATUS_STYLE[s]}>{t(s)}</Badge> : null;

  // ── Compact mode: expandable list (used inside the per-user modal) ──
  if (compact) {
    return (
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-6 text-[var(--text-muted)] text-sm">{t("Loading…")}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-6 text-[var(--text-muted)] text-sm">{t("No audit entries found.")}</div>
        ) : (
          logs.map((log) => {
            const open = expandedId === log._id;
            return (
              <div key={log._id} className="rounded-lg border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : log._id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg)] transition-colors"
                >
                  <span className="text-xs text-[var(--text-muted)] whitespace-nowrap w-32 shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                  <span className="font-mono text-xs text-[var(--text)] flex-1 truncate">{log.action}</span>
                  <SeverityBadge s={log.severity} />
                  <StatusBadge s={log.status} />
                </button>
                {open && (
                  <div className="px-3 pb-3 pt-1 border-t border-[var(--border)]">
                    <EntryDetails entry={log} />
                  </div>
                )}
              </div>
            );
          })
        )}
        {totalPages > 1 && (
          <Pager page={page} totalPages={totalPages} setPage={setPage} t={t} />
        )}
      </div>
    );
  }

  // ── Full mode: table + filters + export + detail drawer ──
  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder={t("Search user, action, IP…")}
            value={filters.q}
            onChange={(e) => setFilter({ q: e.target.value })}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm w-56"
          />
          <select
            value={filters.resource}
            onChange={(e) => setFilter({ resource: e.target.value })}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
          >
            <option value="">{t("All resources")}</option>
            {RESOURCES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={filters.severity}
            onChange={(e) => setFilter({ severity: e.target.value })}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
          >
            <option value="">{t("All severities")}</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilter({ status: e.target.value })}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
          >
            <option value="">{t("All outcomes")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilter({ from: e.target.value })}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
          />
          <span className="self-center text-[var(--text-muted)] text-sm">→</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilter({ to: e.target.value })}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
          />
          <button
            onClick={() => setFilter({ resource: "", severity: "", status: "", q: "", from: "", to: "" })}
            className="px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)] rounded-lg"
          >
            {t("Clear")}
          </button>
          <button
            onClick={exportCsv}
            disabled={exporting}
            className="px-3 py-2 text-sm rounded-lg bg-[var(--brand-primary)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {exporting ? t("Exporting…") : t("Export CSV")}
          </button>
          <span className="ml-auto self-center text-sm text-[var(--text-muted)]">
            {total.toLocaleString()} {t("entries")}
          </span>
        </div>
      )}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg)] border-b border-[var(--border)]">
              <tr>
                {[t("Time"), t("Actor"), t("Action"), t("Target"), t("Severity"), t("Device / IP")].map(
                  (h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-[var(--text-muted)] whitespace-nowrap">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    {t("Loading…")}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    {t("No audit entries found.")}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log._id}
                    onClick={() => setSelected(log)}
                    className="hover:bg-[var(--bg)] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--text)]">{log.actor?.name || "—"}</div>
                      <div className="text-xs text-[var(--text-muted)]">{log.actor?.role || ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-[var(--text)]">{log.action}</span>
                        <StatusBadge s={log.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text)]">
                      {log.target?.name || log.target?.email || (
                        <span className="text-[var(--text-muted)]">{log.resource}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge s={log.severity} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                      <div>{parseDevice(log.userAgent) || "—"}</div>
                      <div className="font-mono">{log.ip || ""}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-[var(--border)]">
            <Pager page={page} totalPages={totalPages} setPage={setPage} t={t} />
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md h-full bg-[var(--surface)] shadow-2xl overflow-y-auto p-5 animate-[slideIn_0.2s_ease]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--text)]">{t("Audit entry")}</h3>
                <div className="mt-1 flex items-center gap-1.5">
                  <SeverityBadge s={selected.severity} />
                  <StatusBadge s={selected.status} />
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
                aria-label={t("Close")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <EntryDetails entry={selected} />
          </div>
        </div>
      )}
    </div>
  );
};

const Pager: React.FC<{
  page: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  t: (k: string) => string;
}> = ({ page, totalPages, setPage, t }) => (
  <div className="flex items-center justify-between px-4 py-3">
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
);

export default AuditTrail;
