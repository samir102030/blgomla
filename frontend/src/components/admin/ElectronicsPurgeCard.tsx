import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";

/**
 * Emptying the electronics section before reloading it from a sheet.
 *
 * The two bulk uploads on the pages next door already rebuild the section
 * correctly, but they match by name and update in place — so a department or a
 * product dropped from the new sheet stays where it is. Loading a catalogue
 * from scratch needs the old one cleared first, and that is all this does.
 *
 * It counts before it asks. What makes this irreversible is not the products —
 * those are coming back from the sheet — but the things filed against them that
 * are not in any sheet: reviews people wrote, alerts they subscribed to, lines
 * sitting in carts. Those numbers are on screen before the button unlocks, and
 * the button stays locked until the section's own name is typed out, because a
 * confirmation you can dismiss by reflex is not a confirmation.
 */

interface Report {
  root: { _id: string; name: string; nameAr?: string; isActive: boolean };
  categories: number;
  products: number;
  ordersReferencing: number;
  bundlesReferencing: number;
  cartsHolding: number;
  wishlistsHolding: number;
  removed?: Record<string, number> | null;
}

const ElectronicsPurgeCard: React.FC = () => {
  const { t } = useTranslation();
  const [report, setReport] = useState<Report | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Report | null>(null);

  const count = async () => {
    setBusy(true);
    setDone(null);
    try {
      const { data } = await axiosInstance.post("/students/admin/catalog/purge?dryRun=true");
      setReport(data);
      setTyped("");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("Could not read the section"));
    } finally {
      setBusy(false);
    }
  };

  const purge = async () => {
    setBusy(true);
    try {
      const { data } = await axiosInstance.post("/students/admin/catalog/purge");
      setDone(data);
      setReport(null);
      setTyped("");
      toast.success(
        t("Emptied: {{p}} products and {{c}} departments", {
          p: data.removed?.products ?? 0,
          c: data.removed?.categories ?? 0,
        })
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("The section was not emptied"));
    } finally {
      setBusy(false);
    }
  };

  const expected = report?.root?.name ?? "";
  const unlocked = !!expected && typed.trim().toLowerCase() === expected.toLowerCase();
  const row = (label: string, value: number, tone = "text-gray-900") => (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={`font-semibold tabular-nums ${tone}`}>{value.toLocaleString()}</span>
    </div>
  );

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-5">
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-red-900">
            {t("Empty this section before reloading it")}
          </h3>
          <p className="mt-1 text-sm text-red-800/90">
            {t(
              "Deletes every department under the section and every product in it, so a fresh sheet can be uploaded into an empty branch. The section itself stays, along with its publish switch. Orders are never touched."
            )}
          </p>

          {!report && !done && (
            <button
              type="button"
              onClick={count}
              disabled={busy}
              className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {busy ? t("Counting…") : t("Count what would go")}
            </button>
          )}

          {report && (
            <div className="mt-4 rounded-lg border border-red-200 bg-white p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                {t("What would be deleted")}
              </p>
              {row(t("Departments"), report.categories, "text-red-700")}
              {row(t("Products"), report.products, "text-red-700")}
              <div className="my-2 border-t border-gray-100" />
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">
                {t("Goes with them — not in any sheet")}
              </p>
              {row(t("Lines sitting in customers' carts"), report.cartsHolding)}
              {row(t("Wishlist entries"), report.wishlistsHolding)}
              <div className="my-2 border-t border-gray-100" />
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">
                {t("Kept as they are")}
              </p>
              {row(t("Orders naming one of these products"), report.ordersReferencing)}
              {row(t("Bundles built from one"), report.bundlesReferencing)}
              {report.bundlesReferencing > 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  {t(
                    "Those bundles will be missing a component afterwards — their price is a decision for you, so they are left alone."
                  )}
                </p>
              )}

              <label className="mt-4 block text-sm font-medium text-gray-700">
                {t("Type {{name}} to unlock", { name: expected })}
              </label>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-red-400"
                dir="ltr"
                autoComplete="off"
              />

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={purge}
                  disabled={!unlocked || busy}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy
                    ? t("Emptying…")
                    : t("Delete {{p}} products and {{c}} departments", {
                        p: report.products.toLocaleString(),
                        c: report.categories.toLocaleString(),
                      })}
                </button>
                <button
                  type="button"
                  onClick={() => setReport(null)}
                  disabled={busy}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t("Cancel")}
                </button>
              </div>
            </div>
          )}

          {done && (
            <div className="mt-4 rounded-lg border border-green-200 bg-white p-4">
              <p className="text-sm font-semibold text-green-800">
                {t("The section is empty and ready for the sheets.")}
              </p>
              <div className="mt-2">
                {Object.entries(done.removed || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-gray-600">{key}</span>
                    <span className="font-semibold tabular-nums text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-gray-700">
                {t("Now upload the departments sheet first, then the products sheet.")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElectronicsPurgeCard;
