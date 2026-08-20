import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import { useMoney } from "../../lib/money";
import { useCan } from "../../lib/permissions";

type Status = "pending" | "scheduled" | "in_progress" | "completed" | "cancelled";

interface InstallationLine {
  kind?: "collection" | "product";
  name?: string;
  quantity?: number;
  price?: number;
}

interface InstallOrder {
  _id: string;
  createdAt: string;
  totalPrice: number;
  installationPrice: number;
  installationStatus: Status;
  installationScheduledAt: string | null;
  installationNotes?: string;
  installationFor?: InstallationLine[];
  status?: string;
  user?: { _id: string; name?: string; email?: string; phoneNumber?: string };
  store?: { _id: string; name?: string };
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    fullName?: string;
    phoneNumber?: string;
  };
}

const STATUSES: Array<{ key: Status; label: string; labelAr: string; tone: string }> = [
  { key: "pending", label: "Pending", labelAr: "في الانتظار", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  { key: "scheduled", label: "Scheduled", labelAr: "متحدد له موعد", tone: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  { key: "in_progress", label: "In progress", labelAr: "قيد التنفيذ", tone: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" },
  { key: "completed", label: "Completed", labelAr: "تم", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  { key: "cancelled", label: "Cancelled", labelAr: "ملغي", tone: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
];

const InstallationOrdersPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");
  const money = useMoney();
  const can = useCan();
  const canManage = can("installations.manage");

  const [orders, setOrders] = useState<InstallOrder[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Status | "all">("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const label = (s: Status) => {
    const found = STATUSES.find((x) => x.key === s);
    if (!found) return s;
    return isAr ? found.labelAr : t(`installations.${s}`, found.label);
  };
  const tone = (s: Status) =>
    STATUSES.find((x) => x.key === s)?.tone ||
    "bg-[var(--bg)] text-[var(--text-muted)] border-[var(--border)]";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/orders/installations", {
        params: filter === "all" ? {} : { status: filter },
      });
      setOrders(data.orders || []);
      setCounts(data.counts || {});
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || t("installations.loadFailed", "Couldn't load installation jobs")
      );
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    setSavingId(id);
    try {
      const { data } = await axiosInstance.put(`/orders/${id}/installation`, body);
      // Patch in place rather than refetching, so a status change doesn't make
      // the row jump out from under the cursor while a filter is active.
      setOrders((prev) =>
        prev.map((o) =>
          o._id === id
            ? {
                ...o,
                installationStatus: data.order.installationStatus,
                installationScheduledAt: data.order.installationScheduledAt,
                installationNotes: data.order.installationNotes,
              }
            : o
        )
      );
      setCounts((prev) => {
        const before = orders.find((o) => o._id === id)?.installationStatus;
        const after = data.order.installationStatus as Status;
        if (!before || before === after) return prev;
        return {
          ...prev,
          [before]: Math.max(0, (prev[before] || 0) - 1),
          [after]: (prev[after] || 0) + 1,
        };
      });
      toast.success(t("installations.saved", "Updated"));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("installations.saveFailed", "Update failed"));
    } finally {
      setSavingId(null);
    }
  };

  const total = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts]
  );

  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString(isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const inputCls =
    "border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] transition-all";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
 {t("installations.title", "Installation jobs")}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          {t(
            "installations.subtitle",
            "Every order where the customer asked us to fit it."
          )}
        </p>
      </div>

      {/* ── status filter ── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            filter === "all"
              ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
              : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]/40"
          }`}
        >
          {t("installations.all", "All")} ({total})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              filter === s.key
                ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]/40"
            }`}
          >
            {label(s.key)} ({counts[s.key] || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand-primary)]" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 text-center">
 <div className="text-4xl mb-3"></div>
          <p className="text-sm font-medium text-[var(--text)]">
            {t("installations.empty", "No installation jobs here")}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {t(
              "installations.emptyHint",
              "An order lands here the moment a customer ticks the installation box."
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const open = expanded === o._id;
            return (
              <div
                key={o._id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${tone(
                            o.installationStatus
                          )}`}
                        >
                          {label(o.installationStatus)}
                        </span>
                        <Link
                          to={`/dashboard/order`}
                          className="text-sm font-semibold text-[var(--text)] hover:text-[var(--brand-primary)] transition-colors"
                        >
                          #{o._id.slice(-8).toUpperCase()}
                        </Link>
                        <span className="text-xs text-[var(--text-muted)]">
                          {fmtDate(o.createdAt)}
                        </span>
                      </div>

                      <p className="text-sm text-[var(--text)] mt-1.5 font-medium">
                        {o.user?.name || t("installations.guest", "Guest")}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {o.user?.phoneNumber || o.shippingAddress?.phoneNumber || "—"}
                        {o.shippingAddress?.city ? ` · ${o.shippingAddress.city}` : ""}
                      </p>
                    </div>

                    <div className="text-end shrink-0">
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {t("installations.fee", "Fitting")}
                      </p>
                      <p className="text-lg font-bold text-[var(--text)]">
                        {money(o.installationPrice)}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {t("installations.orderTotal", "Order")} {money(o.totalPrice)}
                      </p>
                    </div>
                  </div>

                  {/* what was promised */}
                  {o.installationFor && o.installationFor.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {o.installationFor.map((f, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-[11px] text-[var(--text-muted)]"
                        >
 {f.kind === "product" ? "" : ""} {f.name}
                          {(f.quantity ?? 1) > 1 ? ` ×${f.quantity}` : ""}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {o.installationScheduledAt && (
                      <span className="text-xs text-[var(--text)]">
 {fmtDate(o.installationScheduledAt)}
                      </span>
                    )}
                    <button
                      onClick={() => setExpanded(open ? null : o._id)}
                      className="text-xs font-semibold text-[var(--brand-primary)] hover:underline"
                    >
                      {open
                        ? t("installations.hide", "Hide")
                        : t("installations.manage", "Schedule / update")}
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-[var(--border)] bg-[var(--bg)] p-4 sm:p-5 space-y-3">
                    {!canManage ? (
                      <p className="text-xs text-[var(--text-muted)]">
                        {t(
                          "installations.readOnly",
                          "You can view this queue but not change it. Ask an administrator for the manage permission."
                        )}
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {STATUSES.map((s) => (
                            <button
                              key={s.key}
                              disabled={savingId === o._id || o.installationStatus === s.key}
                              onClick={() => patch(o._id, { status: s.key })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                o.installationStatus === s.key
                                  ? tone(s.key)
                                  : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]/40"
                              }`}
                            >
                              {label(s.key)}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                              {t("installations.scheduledAt", "Visit date")}
                            </label>
                            <input
                              type="date"
                              defaultValue={
                                o.installationScheduledAt
                                  ? new Date(o.installationScheduledAt).toISOString().slice(0, 10)
                                  : ""
                              }
                              onBlur={(e) =>
                                patch(o._id, { scheduledAt: e.target.value || null })
                              }
                              className={`${inputCls} w-full`}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                              {t("installations.notes", "Notes for the team")}
                            </label>
                            <input
                              type="text"
                              defaultValue={o.installationNotes || ""}
                              onBlur={(e) => {
                                if ((e.target.value || "") !== (o.installationNotes || "")) {
                                  patch(o._id, { notes: e.target.value });
                                }
                              }}
                              className={`${inputCls} w-full`}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-3">
                      <p>
                        <span className="font-semibold">{t("installations.address", "Address")}:</span>{" "}
                        {[
                          o.shippingAddress?.street,
                          o.shippingAddress?.city,
                          o.shippingAddress?.state,
                        ]
                          .filter(Boolean)
                          .join("، ") || "—"}
                      </p>
                      {o.user?.email && (
                        <p className="mt-0.5">
                          <span className="font-semibold">{t("installations.email", "Email")}:</span>{" "}
                          {o.user.email}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InstallationOrdersPage;
