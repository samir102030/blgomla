import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";

interface Payout {
  _id: string;
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

interface PayoutDetails {
  method?: "bank_transfer" | "instapay" | "wallet" | null;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  instapayHandle?: string;
  walletNumber?: string;
  notes?: string;
}

const fmt = (n: number) =>
  Number(n || 0).toLocaleString("en-EG", { maximumFractionDigits: 2 });

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] text-sm";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  cancelled: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300",
};

const VendorPayoutsPage: React.FC = () => {
  const { t } = useTranslation();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<PayoutDetails>({});
  const [savingDetails, setSavingDetails] = useState(false);

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/payouts");
      setPayouts(data.payouts || []);
      // Pull current payout details from the first populated store ref we get.
      const populated = (data.payouts || []).find(
        (p: any) => p.store?.payoutDetails
      );
      if (populated) setDetails(populated.store.payoutDetails);
    } catch {
      toast.error(t("Couldn't load your payouts"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Load existing payout details by fetching the vendor's store record.
  const loadDetails = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/stores/store");
      const d = data?.store?.payoutDetails;
      if (d) setDetails(d);
    } catch {
      /* ignore — vendor will fill in fresh */
    }
  }, []);

  useEffect(() => {
    loadPayouts();
    loadDetails();
  }, [loadPayouts, loadDetails]);

  const saveDetails = async () => {
    setSavingDetails(true);
    try {
      await axiosInstance.put("/payouts/my-details", details);
      toast.success(t("Payout details saved"));
    } catch {
      toast.error(t("Couldn't save payout details"));
    } finally {
      setSavingDetails(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-1">
        💸 {t("My Payouts")}
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        {t(
          "Statements for delivered orders. The platform commission is deducted on each line; the net amount is what's transferred to you."
        )}
      </p>

      {/* Payout destination */}
      <section className="mb-8 rounded-lg border border-[var(--border)] p-4 bg-[var(--surface)]">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-3">
          {t("Where should we send your money?")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs text-[var(--text-muted)] mb-1">{t("Method")}</span>
            <select
              value={details.method || ""}
              onChange={(e) =>
                setDetails((d) => ({
                  ...d,
                  method: (e.target.value || null) as PayoutDetails["method"],
                }))
              }
              className={inputCls}
            >
              <option value="">{t("— Pick a method —")}</option>
              <option value="instapay">{t("Instapay")}</option>
              <option value="bank_transfer">{t("Bank transfer")}</option>
              <option value="wallet">{t("Mobile wallet")}</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-[var(--text-muted)] mb-1">{t("Account holder name")}</span>
            <input
              type="text"
              value={details.accountName || ""}
              onChange={(e) => setDetails((d) => ({ ...d, accountName: e.target.value }))}
              className={inputCls}
            />
          </label>
          {details.method === "bank_transfer" && (
            <>
              <label className="block">
                <span className="block text-xs text-[var(--text-muted)] mb-1">{t("Bank name")}</span>
                <input
                  type="text"
                  value={details.bankName || ""}
                  onChange={(e) => setDetails((d) => ({ ...d, bankName: e.target.value }))}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block text-xs text-[var(--text-muted)] mb-1">{t("IBAN / account number")}</span>
                <input
                  type="text"
                  value={details.accountNumber || ""}
                  onChange={(e) =>
                    setDetails((d) => ({ ...d, accountNumber: e.target.value }))
                  }
                  className={inputCls}
                />
              </label>
            </>
          )}
          {details.method === "instapay" && (
            <label className="block">
              <span className="block text-xs text-[var(--text-muted)] mb-1">{t("Instapay handle")}</span>
              <input
                type="text"
                value={details.instapayHandle || ""}
                onChange={(e) =>
                  setDetails((d) => ({ ...d, instapayHandle: e.target.value }))
                }
                placeholder="@you"
                className={inputCls}
              />
            </label>
          )}
          {details.method === "wallet" && (
            <label className="block">
              <span className="block text-xs text-[var(--text-muted)] mb-1">{t("Wallet number")}</span>
              <input
                type="text"
                value={details.walletNumber || ""}
                onChange={(e) =>
                  setDetails((d) => ({ ...d, walletNumber: e.target.value }))
                }
                placeholder="+201XXXXXXXXX"
                className={inputCls}
              />
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="block text-xs text-[var(--text-muted)] mb-1">{t("Notes (optional)")}</span>
            <textarea
              rows={2}
              value={details.notes || ""}
              onChange={(e) => setDetails((d) => ({ ...d, notes: e.target.value }))}
              className={inputCls}
            />
          </label>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={saveDetails}
            disabled={savingDetails}
            className="px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {savingDetails ? t("Saving…") : t("Save details")}
          </button>
        </div>
      </section>

      {/* Statements */}
      <section>
        <h2 className="text-base font-semibold text-[var(--text)] mb-2">
          {t("Statements")}
        </h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            {loading ? t("Loading…") : t("No statements yet. Once the admin generates a payout, it'll show up here.")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">{t("Period")}</th>
                  <th className="px-3 py-2 text-right">{t("Orders")}</th>
                  <th className="px-3 py-2 text-right">{t("Gross")}</th>
                  <th className="px-3 py-2 text-right">{t("Fee")}</th>
                  <th className="px-3 py-2 text-right">{t("Net")}</th>
                  <th className="px-3 py-2 text-left">{t("Status")}</th>
                  <th className="px-3 py-2 text-left">{t("Reference")}</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p._id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 text-[var(--text-muted)] text-xs whitespace-nowrap">
                      {new Date(p.periodStart).toLocaleDateString()} →{" "}
                      {new Date(p.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">{p.ordersCount}</td>
                    <td className="px-3 py-2 text-right">{fmt(p.grossSales)}</td>
                    <td className="px-3 py-2 text-right text-[var(--text-muted)]">
                      −{fmt(p.platformFee)} ({p.commissionRate}%)
                    </td>
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
                      {p.method
                        ? `${p.method}${p.reference ? ` · ${p.reference}` : ""}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default VendorPayoutsPage;
