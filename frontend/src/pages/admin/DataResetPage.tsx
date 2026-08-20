import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { ExclamationTriangleIcon, TrashIcon } from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";
import { useUserStore } from "../../stores/user.store";

type Section = {
  key: string;
  label: string;
  labelAr: string;
  group: string;
  warn: string | null;
  warnAr: string | null;
  count: number;
};

const GROUP_LABELS: Record<string, { en: string; ar: string }> = {
  catalogue: { en: "Catalogue", ar: "الكتالوج" },
  marketing: { en: "Marketing & content", ar: "التسويق والمحتوى" },
  sales: { en: "Sales", ar: "المبيعات" },
  people: { en: "People", ar: "الأشخاص" },
  operations: { en: "Operations", ar: "التشغيل" },
};

const GROUP_ORDER = ["catalogue", "marketing", "sales", "people", "operations"];

const DataResetPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const role = useUserStore((s) => s.user?.role);

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Section | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/data-reset/sections");
      setSections(data.sections || []);
    } catch {
      toast.error(ar ? "مش قادر أقرا الأقسام" : "Could not load the sections");
    } finally {
      setLoading(false);
    }
  }, [ar]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const by: Record<string, Section[]> = {};
    for (const s of sections) (by[s.group] ||= []).push(s);
    return GROUP_ORDER.filter((g) => by[g]?.length).map((g) => ({ group: g, items: by[g] }));
  }, [sections]);

  // The page is routed behind a super-admin check too; this is the copy a
  // demoted admin sees rather than a blank screen.
  if (role !== "super_admin") {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--text-muted)]">
          {ar
            ? "الصفحة دي متاحة للـ Super Admin بس."
            : "This page is for super admins only."}
        </p>
      </div>
    );
  }

  const confirmed = pending && typed.trim() === pending.key;

  const runReset = async () => {
    if (!pending || !confirmed) return;
    setBusy(true);
    try {
      const { data } = await axiosInstance.post(`/data-reset/sections/${pending.key}`, {
        confirm: pending.key,
      });
      const total = Object.values(data.deleted || {}).reduce(
        (a: number, b) => a + (Number(b) || 0),
        0,
      );
      toast.success(
        ar
          ? `اتمسح ${total} عنصر من ${pending.labelAr}`
          : `Deleted ${total} record${total === 1 ? "" : "s"} from ${pending.label}`,
      );
      setPending(null);
      setTyped("");
      load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || (ar ? "المسح مانجحش" : "The reset did not go through"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          {ar ? "مسح البيانات" : "Clear data"}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)] max-w-2xl">
          {ar
            ? "كل زرار هنا بيفضّي قسم كامل من قاعدة البيانات. مفيش تراجع بعد الضغط — خد نسخة احتياطية الأول."
            : "Each button here empties a whole section of the database. There is no undo — take a backup first."}
        </p>
      </header>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
        <p className="text-sm text-[var(--text)]">
          {ar
            ? "حسابك وحسابات الإدارة والصلاحيات مش بتتمسح من هنا أبداً — عشان متتقفلش برّه لوحة التحكم."
            : "Your account, the other admin accounts and the roles are never removed here, so this page cannot lock you out."}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">{t("Loading...", "Loading…")}</p>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ group, items }) => (
            <section key={group}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {ar ? GROUP_LABELS[group]?.ar : GROUP_LABELS[group]?.en}
              </h2>
              <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                {items.map((s) => (
                  <li
                    key={s.key}
                    className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-[var(--text)]">
                          {ar ? s.labelAr : s.label}
                        </span>
                        <span
                          className="text-sm tabular-nums text-[var(--text-muted)]"
                          dir="ltr"
                        >
                          {s.count.toLocaleString(ar ? "ar-EG" : "en-US")}
                        </span>
                      </div>
                      {(ar ? s.warnAr : s.warn) && (
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {ar ? s.warnAr : s.warn}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={s.count === 0}
                      onClick={() => {
                        setPending(s);
                        setTyped("");
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:text-[var(--text-muted)] disabled:hover:bg-transparent"
                    >
                      <TrashIcon className="h-4 w-4" />
                      {s.count === 0
                        ? ar
                          ? "فاضي"
                          : "Empty"
                        : ar
                          ? "امسح"
                          : "Clear"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--text)]">
              {ar ? `مسح ${pending.labelAr}` : `Clear ${pending.label}`}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {ar
                ? `${pending.count.toLocaleString("ar-EG")} عنصر هيتمسحوا نهائياً.`
                : `${pending.count.toLocaleString("en-US")} record${pending.count === 1 ? "" : "s"} will be permanently deleted.`}
            </p>
            {(ar ? pending.warnAr : pending.warn) && (
              <p className="mt-2 rounded-lg bg-red-500/5 p-3 text-xs text-[var(--text)]">
                {ar ? pending.warnAr : pending.warn}
              </p>
            )}

            <label className="mt-4 block">
              <span className="block text-sm text-[var(--text)]">
                {ar ? (
                  <>
                    اكتب <code className="font-mono font-semibold">{pending.key}</code> عشان تأكّد
                  </>
                ) : (
                  <>
                    Type <code className="font-mono font-semibold">{pending.key}</code> to confirm
                  </>
                )}
              </span>
              <input
                autoFocus
                dir="ltr"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && confirmed && !busy) runReset();
                  if (e.key === "Escape") setPending(null);
                }}
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={busy}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
              >
                {ar ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={runReset}
                disabled={!confirmed || busy}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? (ar ? "بيمسح…" : "Clearing…") : ar ? "امسح نهائياً" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataResetPage;
