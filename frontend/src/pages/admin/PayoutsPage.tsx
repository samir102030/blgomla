import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";

interface EligibleStore {
  storeId: string;
  storeName: string;
  ordersCount: number;
  grossSales: number;
  shippingTotal: number;
  commissionRate: number;
  platformFee: number;
  netPayable: number;
}

interface Payout {
  _id: string;
  store: { _id: string; storeName: string; logo?: string };
  periodStart: string;
  periodEnd: string;
  ordersCount: number;
  grossSales: number;
  shippingTotal: number;
  commissionRate: number;
  platformFee: number;
  netPayable: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "cancelled";
  method?: string | null;
  reference?: string;
  notes?: string;
  paidAt?: string;
  createdAt: string;
}

const fmt = (n: number) => Number(n || 0).toLocaleString("en-EG", { maximumFractionDigits: 2 });

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] text-sm";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  cancelled: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300",
};

const PayoutsPage: React.FC = () => {
  const { t } = useTranslation();

  const today = new Date().toISOString().slice(0, 10);
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [from, setFrom] = useState(lastMonth);
  const [to, setTo] = useState(today);
  const [eligible, setEligible] = useState<EligibleStore[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Mark-paid modal
  const [paying, setPaying] = useState<Payout | null>(null);
  const [payMethod, setPayMethod] = useState<string>("instapay");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const loadEligible = useCallback(async () => {
    setLoadingEligible(true);
    try {
      const { data } = await axiosInstance.get("/payouts/eligible-stores", {
        params: { from, to },
      });
      setEligible(data.stores || []);
    } catch {
      toast.error(t("Couldn't load eligible stores"));
    } finally {
      setLoadingEligible(false);
    }
  }, [from, to, t]);

  const loadPayouts = useCallback(async () => {
    setLoadingPayouts(true);
    try {
      const { data } = await axiosInstance.get("/payouts");
      setPayouts(data.payouts || []);
    } catch {
      toast.error(t("Couldn't load payouts"));
    } finally {
      setLoadingPayouts(false);
    }
  }, [t]);

  useEffect(() => {
    loadEligible();
    loadPayouts();
  }, [loadEligible, loadPayouts]);

  const createPayout = async (storeId: string) => {
    setBusy(storeId);
    try {
      await axiosInstance.post("/payouts", { store: storeId, from, to });
      toast.success(t("Payout created"));
      await Promise.all([loadEligible(), loadPayouts()]);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || t("Couldn't create the payout")
      );
    } finally {
      setBusy(null);
    }
  };

  const submitMarkPaid = async () => {
    if (!paying) return;
    setBusy(paying._id);
    try {
      await axiosInstance.post(`/payouts/${paying._id}/mark-paid`, {
        method: payMethod,
        reference: payRef,
        notes: payNotes,
      });
      toast.success(t("Payout marked as paid"));
      setPaying(null);
      setPayRef("");
      setPayNotes("");
      await loadPayouts();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || t("Couldn't mark the payout as paid")
      );
    } finally {
      setBusy(null);
    }
  };

  const cancelPayout = async (id: string) => {
    if (!confirm(t("Cancel this payout? The included orders will become payable again."))) return;
    setBusy(id);
    try {
      await axiosInstance.post(`/payouts/${id}/cancel`);
      toast.success(t("Payout cancelled"));
      await Promise.all([loadEligible(), loadPayouts()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("Couldn't cancel the payout"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-1">
        💸 {t("Vendor Payouts")}
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-5">
        {t(
          "Generate per-period payouts from delivered + paid orders. Each generated payout locks those orders so they're never double-counted."
        )}
      </p>

      {/* Range picker */}
      <section className="mb-6 rounded-lg border border-[var(--border)] p-3 bg-[var(--surface)]">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-xs text-[var(--text-muted)] mb-1">
              {t("From")}
            </span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={inputCls + " w-44"}
            />
          </label>
          <label className="block">
            <span className="block text-xs text-[var(--text-muted)] mb-1">
              {t("To")}
            </span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={inputCls + " w-44"}
            />
          </label>
          <button
            type="button"
            onClick={loadEligible}
            disabled={loadingEligible}
            className="px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loadingEligible ? t("Loading…") : t("Refresh preview")}
          </button>
        </div>
      </section>

      {/* Eligible stores */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--text)] mb-2">
          {t("Eligible stores in range")}
        </h2>
        {eligible.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            {loadingEligible
              ? t("Loading…")
              : t("No payable orders in the selected range. Try widening the dates.")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">{t("Store")}</th>
                  <th className="px-3 py-2 text-right">{t("Orders")}</th>
                  <th className="px-3 py-2 text-right">{t("Gross")}</th>
                  <th className="px-3 py-2 text-right">{t("Commission")}</th>
                  <th className="px-3 py-2 text-right">{t("Fee")}</th>
                  <th className="px-3 py-2 text-right">{t("Net payable")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {eligible.map((s) => (
                  <tr key={s.storeId} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 font-medium text-[var(--text)]">{s.storeName}</td>
                    <td className="px-3 py-2 text-right">{s.ordersCount}</td>
                    <td className="px-3 py-2 text-right">{fmt(s.grossSales)}</td>
                    <td className="px-3 py-2 text-right text-[var(--text-muted)]">
                      {s.commissionRate}%
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--text-muted)]">
                      −{fmt(s.platformFee)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {fmt(s.netPayable)} EGP
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => createPayout(s.storeId)}
                        disabled={busy === s.storeId}
                        className="px-3 py-1.5 rounded-md bg-[var(--brand-primary)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        {busy === s.storeId ? t("…") : t("Generate")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Payout history */}
      <section>
        <h2 className="text-base font-semibold text-[var(--text)] mb-2">
          {t("Payout history")}
        </h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            {loadingPayouts ? t("Loading…") : t("No payouts yet.")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">{t("Store")}</th>
                  <th className="px-3 py-2 text-left">{t("Period")}</th>
                  <th className="px-3 py-2 text-right">{t("Orders")}</th>
                  <th className="px-3 py-2 text-right">{t("Net")}</th>
                  <th className="px-3 py-2 text-left">{t("Status")}</th>
                  <th className="px-3 py-2 text-left">{t("Reference")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p._id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 font-medium text-[var(--text)]">
                      {p.store?.storeName || "—"}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)] text-xs">
                      {new Date(p.periodStart).toLocaleDateString()} →{" "}
                      {new Date(p.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">{p.ordersCount}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {fmt(p.netPayable)} {p.currency}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          STATUS_STYLES[p.status] || ""
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--text-muted)]">
                      {p.method ? `${p.method}${p.reference ? ` · ${p.reference}` : ""}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {p.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setPaying(p);
                              setPayMethod("instapay");
                              setPayRef("");
                              setPayNotes("");
                            }}
                            className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-medium hover:opacity-90"
                          >
                            {t("Mark paid")}
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelPayout(p._id)}
                            disabled={busy === p._id}
                            className="ml-2 px-2.5 py-1 rounded-md border border-[var(--border)] text-[var(--text)] text-xs hover:bg-[var(--surface-2)] disabled:opacity-50"
                          >
                            {t("Cancel")}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Mark-paid modal */}
      {paying && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setPaying(null)}
        >
          <div
            className="bg-[var(--surface)] rounded-xl shadow-xl border border-[var(--border)] w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-[var(--text)] mb-1">
              {t("Mark payout as paid")}
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {paying.store.storeName} ·{" "}
              <span className="font-semibold text-[var(--text)]">
                {fmt(paying.netPayable)} {paying.currency}
              </span>
            </p>

            <label className="block mb-3">
              <span className="block text-xs text-[var(--text-muted)] mb-1">
                {t("Method")}
              </span>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className={inputCls}
              >
                <option value="instapay">{t("Instapay")}</option>
                <option value="bank_transfer">{t("Bank transfer")}</option>
                <option value="wallet">{t("Mobile wallet")}</option>
                <option value="manual">{t("Manual / other")}</option>
              </select>
            </label>

            <label className="block mb-3">
              <span className="block text-xs text-[var(--text-muted)] mb-1">
                {t("Reference (txn id, IBAN, etc.)")}
              </span>
              <input
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className={inputCls}
              />
            </label>

            <label className="block mb-5">
              <span className="block text-xs text-[var(--text-muted)] mb-1">
                {t("Notes (optional)")}
              </span>
              <textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                rows={2}
                className={inputCls}
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaying(null)}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--surface-2)]"
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={submitMarkPaid}
                disabled={busy === paying._id}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {busy === paying._id ? t("Saving…") : t("Confirm payment")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayoutsPage;
