import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  useSiteModeStore,
  type SiteModeAdmin,
} from "../../stores/siteMode.store";

const genKey = () =>
  Math.random().toString(36).slice(2, 10) +
  Math.random().toString(36).slice(2, 10);

const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <label className="block mb-4">
    <span className="block text-sm font-semibold text-[var(--text)] mb-1">
      {label}
    </span>
    {children}
    {hint && (
      <span className="block text-xs text-[var(--text-muted)] mt-1">{hint}</span>
    )}
  </label>
);

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]";

const SiteModePage: React.FC = () => {
  const { t } = useTranslation();
  const {
    adminMode,
    subscribers,
    loading,
    fetchAdminMode,
    updateAdminMode,
    fetchSubscribers,
  } = useSiteModeStore();

  const [draft, setDraft] = useState<Partial<SiteModeAdmin>>({});

  useEffect(() => {
    fetchAdminMode();
    fetchSubscribers();
  }, [fetchAdminMode, fetchSubscribers]);

  useEffect(() => {
    if (adminMode) setDraft(adminMode);
  }, [adminMode]);

  const set = <K extends keyof SiteModeAdmin>(k: K, v: SiteModeAdmin[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const setNested = (k: "title" | "message" | "socialLinks", inner: any) =>
    setDraft((d) => ({ ...d, [k]: { ...(d?.[k] || {}), ...inner } }));

  const onSave = async () => {
    const ok = await updateAdminMode(draft);
    if (ok) toast.success(t("siteMode.saved", "Saved"));
    else toast.error(t("siteMode.saveError", "Save failed"));
  };

  const onToggleComingSoon = async () => {
    const next = !draft.comingSoon;
    setDraft((d) => ({ ...d, comingSoon: next }));
    const ok = await updateAdminMode({ ...draft, comingSoon: next });
    if (ok)
      toast.success(
        next
          ? t("siteMode.enabled", "Coming Soon is now ON")
          : t("siteMode.disabled", "Coming Soon is now OFF")
      );
  };

  const generatePreviewKey = () => {
    const k = genKey();
    set("previewKey", k);
  };

  const previewLink = draft.previewKey
    ? `${window.location.origin}/?previewKey=${draft.previewKey}`
    : "";

  if (loading && !adminMode) {
    return (
      <div className="p-8 text-[var(--text-muted)]">
        {t("common.loading", "Loading…")}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          {t("siteMode.title", "Coming Soon Mode")}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {t(
            "siteMode.subtitle",
            "Show a launch splash to public visitors. Admins and preview links always see the real site."
          )}
        </p>
      </div>

      {/* Big toggle */}
      <div className="mb-8 p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
        <div>
          <div className="font-semibold text-[var(--text)]">
            {t("siteMode.statusLabel", "Coming Soon Splash")}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            {draft.comingSoon
              ? t(
                  "siteMode.statusOn",
                  "Visitors will see the splash until you turn this off."
                )
              : t(
                  "siteMode.statusOff",
                  "The store is live — splash is hidden."
                )}
          </div>
        </div>
        <button
          onClick={onToggleComingSoon}
          className={`relative w-14 h-8 rounded-full transition ${
            draft.comingSoon ? "bg-[#00A8E8]" : "bg-gray-400"
          }`}
          aria-label="Toggle coming soon"
        >
          <span
            className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition ${
              draft.comingSoon ? "translate-x-6" : ""
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <h2 className="font-semibold mb-3 text-[var(--text)]">
            {t("siteMode.copyEn", "English Copy")}
          </h2>
          <Field label={t("siteMode.headline", "Headline")}>
            <input
              className={inputCls}
              value={draft.title?.en || ""}
              onChange={(e) => setNested("title", { en: e.target.value })}
            />
          </Field>
          <Field label={t("siteMode.message", "Message")}>
            <textarea
              rows={3}
              className={inputCls}
              value={draft.message?.en || ""}
              onChange={(e) => setNested("message", { en: e.target.value })}
            />
          </Field>
        </div>

        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <h2 className="font-semibold mb-3 text-[var(--text)]">
            {t("siteMode.copyAr", "Arabic Copy")}
          </h2>
          <Field label={t("siteMode.headline", "Headline")}>
            <input
              className={inputCls}
              dir="rtl"
              value={draft.title?.ar || ""}
              onChange={(e) => setNested("title", { ar: e.target.value })}
            />
          </Field>
          <Field label={t("siteMode.message", "Message")}>
            <textarea
              rows={3}
              className={inputCls}
              dir="rtl"
              value={draft.message?.ar || ""}
              onChange={(e) => setNested("message", { ar: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] mb-6">
        <h2 className="font-semibold mb-3 text-[var(--text)]">
          {t("siteMode.launch", "Launch & Preview")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label={t("siteMode.launchAt", "Launch date (optional)")}
            hint={t(
              "siteMode.launchAtHint",
              "Drives the live countdown on the splash."
            )}
          >
            <input
              type="datetime-local"
              className={inputCls}
              value={
                draft.launchAt
                  ? new Date(draft.launchAt).toISOString().slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                set(
                  "launchAt",
                  (e.target.value ? new Date(e.target.value).toISOString() : null) as any
                )
              }
            />
          </Field>
          <Field
            label={t("siteMode.previewKey", "Preview key")}
            hint={t(
              "siteMode.previewKeyHint",
              "Share the link below with stakeholders to bypass the splash."
            )}
          >
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={draft.previewKey || ""}
                onChange={(e) => set("previewKey", e.target.value)}
              />
              <button
                onClick={generatePreviewKey}
                className="px-3 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-medium hover:brightness-110"
              >
                {t("siteMode.generate", "Generate")}
              </button>
            </div>
            {previewLink && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewLink);
                  toast.success(t("siteMode.copied", "Link copied"));
                }}
                className="mt-2 text-xs text-[var(--brand-accent)] underline break-all text-left"
              >
                {previewLink}
              </button>
            )}
          </Field>
        </div>

        <div className="flex flex-col gap-3 mt-2">
          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={!!draft.allowAdminBypass}
              onChange={(e) => set("allowAdminBypass", e.target.checked)}
            />
            {t(
              "siteMode.allowAdminBypass",
              "Admins automatically see the real site (recommended)"
            )}
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={!!draft.blockPublicApi}
              onChange={(e) => set("blockPublicApi", e.target.checked)}
            />
            {t(
              "siteMode.blockPublicApi",
              "Also return 503 from the public API (recommended for SEO)"
            )}
          </label>
        </div>
      </div>

      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] mb-6">
        <h2 className="font-semibold mb-3 text-[var(--text)]">
          {t("siteMode.socials", "Social links")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(["facebook", "instagram", "twitter", "youtube"] as const).map(
            (k) => (
              <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
                <input
                  className={inputCls}
                  placeholder={`https://${k}.com/…`}
                  value={(draft.socialLinks as any)?.[k] || ""}
                  onChange={(e) =>
                    setNested("socialLinks", { [k]: e.target.value })
                  }
                />
              </Field>
            )
          )}
        </div>
      </div>

      <div className="flex gap-3 mb-10">
        <button
          onClick={onSave}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg bg-[var(--brand-primary)] text-white font-semibold hover:brightness-110 disabled:opacity-60"
        >
          {t("siteMode.save", "Save changes")}
        </button>
      </div>

      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[var(--text)]">
            {t("siteMode.subscribers", "Email subscribers")} ({subscribers.length})
          </h2>
          <button
            onClick={() => fetchSubscribers()}
            className="text-sm text-[var(--brand-accent)] hover:underline"
          >
            {t("common.refresh", "Refresh")}
          </button>
        </div>
        {subscribers.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            {t("siteMode.noSubscribers", "No subscribers yet.")}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)] max-h-72 overflow-auto">
            {subscribers.map((s) => (
              <li
                key={s._id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-[var(--text)]">{s.email}</span>
                <span className="text-[var(--text-muted)]">
                  {new Date(s.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SiteModePage;
