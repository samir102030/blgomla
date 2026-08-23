import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { ArrowPathIcon, ExclamationTriangleIcon, TagIcon } from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";
import { useMoney } from "../../lib/money";

/**
 * What the shop is discounting right now.
 *
 * Nothing in the dashboard listed this. The Sales page is analytics over orders
 * — what was sold — and there was no view of what is currently marked down, so
 * 860 products carrying discounts spread evenly across every percentage from
 * 1 to 100 sat on the storefront unremarked, and the order endpoint charged
 * them.
 *
 * This card decides nothing. Pricing belongs to whoever runs the shop, and they
 * could not make the call without the numbers. Clearing switches `saleActive`
 * off and leaves every `salePercentage` untouched, so a campaign cleared by
 * mistake is one flag away from coming back.
 */

interface Deepest {
  _id: string;
  name: string;
  price: number;
  salePercentage: number;
  sellsFor: number;
}

interface Audit {
  onSale: number;
  listValue: number;
  discount: number;
  halfOrMore: number;
  bands: Record<string, number>;
  deepest: Deepest[];
}

const SaleAuditCard: React.FC = () => {
  const { i18n } = useTranslation();
  const money = useMoney();
  const ar = i18n.language === "ar";

  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [threshold, setThreshold] = useState(50);
  const [typed, setTyped] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/products/sales/audit");
      setAudit(data);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          (ar ? "مش قادر أقرا الخصومات" : "Could not read the discounts")
      );
    } finally {
      setLoading(false);
    }
  }, [ar]);

  useEffect(() => {
    load();
  }, [load]);

  const clear = async () => {
    setBusy(true);
    try {
      const { data } = await axiosInstance.post("/products/sales/clear", {
        minPercentage: threshold,
      });
      toast.success(
        ar
          ? `اتوقف الخصم على ${Number(data.cleared || 0).toLocaleString()} منتج`
          : `Discount switched off on ${Number(data.cleared || 0).toLocaleString()} products`
      );
      setTyped("");
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || (ar ? "مانفعش" : "That did not work"));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !audit) {
    return <div className="h-32 rounded-2xl bg-gray-100 animate-pulse" />;
  }
  if (!audit) return null;

  if (!audit.onSale) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-3">
        <TagIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
        <p className="text-sm text-gray-600">
          {ar ? "مفيش أي منتج عليه خصم دلوقتي." : "No product is discounted right now."}
        </p>
      </div>
    );
  }

  const unlocked = typed.trim().toUpperCase() === "CLEAR";

  return (
    <div className="bg-white rounded-2xl border border-amber-300 p-6">
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 shrink-0" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {ar ? "خصومات شغالة دلوقتي" : "Discounts live right now"}
          </h2>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
            {ar
              ? "دي الأسعار اللي المتجر بيبيع بيها فعلاً. راجعها قبل ما تفتح للعملاء."
              : "These are the prices the shop is actually selling at. Worth reading before it opens."}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          [ar ? "منتج عليه خصم" : "On sale", audit.onSale.toLocaleString()],
          [ar ? "نصف السعر أو أقل" : "Half price or less", audit.halfOrMore.toLocaleString()],
          [ar ? "قيمتهم بسعر القائمة" : "List value", money(audit.listValue)],
          [ar ? "المتنازل عنه" : "Given away", money(audit.discount)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-gray-200 p-3">
            <p className="text-lg font-semibold text-gray-900 tabular-nums">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* The shape is the argument: an even spread across every band is not a
          pricing decision, it is noise. */}
      <ul className="mt-4 space-y-1">
        {Object.entries(audit.bands).map(([band, n]) => (
          <li key={band} className="flex items-center gap-3 text-sm">
            <span className="font-mono text-xs text-gray-500 w-16 shrink-0" dir="ltr">
              {band}%
            </span>
            <span
              className="h-2 rounded-full bg-amber-400/70"
              style={{ width: `${Math.min((n / audit.onSale) * 260, 260)}px` }}
            />
            <span className="text-xs text-gray-500 tabular-nums">{n}</span>
          </li>
        ))}
      </ul>

      {audit.deepest.length > 0 && (
        <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {audit.deepest.slice(0, 5).map((p) => (
                <tr key={p._id} className="border-b border-gray-100 last:border-0">
                  <td className="p-2.5 text-xs font-semibold text-amber-700 tabular-nums w-14">
                    −{p.salePercentage}%
                  </td>
                  <td className="p-2.5 text-gray-700 truncate max-w-0">{p.name}</td>
                  <td className="p-2.5 text-xs text-gray-500 tabular-nums whitespace-nowrap" dir="ltr">
                    <s>{money(p.price)}</s> → <b className="text-gray-900">{money(p.sellsFor)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 rounded-xl bg-gray-50 border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-800">
          {ar ? "أوقف الخصم على اللي نسبته" : "Switch off discounts of"}{" "}
          <span className="tabular-nums">{threshold}%</span>{" "}
          {ar ? "أو أكتر" : "or more"}
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          disabled={busy}
          className="w-full mt-2 accent-[var(--brand-primary,#00A8E8)]"
        />
        <p className="text-xs text-gray-500 mt-1">
          {ar
            ? "النسبة نفسها بتفضل متسجّلة — اللي بيتغيّر هو تفعيل الخصم بس، فينفع يترجّع."
            : "The percentage itself is kept; only the active flag changes, so this can be undone."}
        </p>

        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={ar ? 'اكتب CLEAR للتأكيد' : 'Type CLEAR to confirm'}
            className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
            dir="ltr"
          />
          <button
            type="button"
            onClick={clear}
            disabled={!unlocked || busy}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? (ar ? "بيشتغل…" : "Working…") : ar ? "أوقفها" : "Switch them off"}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={busy}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-white disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaleAuditCard;
