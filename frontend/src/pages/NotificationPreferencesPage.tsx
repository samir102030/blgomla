import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { axiosInstance } from "../lib/axios";
import type { NotificationPreferences } from "../types/notification.type";

type ChannelKey = "emailNotifications" | "pushNotifications";
type SmsKey = "orders" | "accountActivity";

const CHANNEL_CATEGORIES: Array<{ key: keyof NotificationPreferences["emailNotifications"]; labelKey: string }> = [
  { key: "orders", labelKey: "Orders" },
  { key: "promotions", labelKey: "Promotions" },
  { key: "productUpdates", labelKey: "Product Updates" },
  { key: "accountActivity", labelKey: "Account Activity" },
  { key: "vendorUpdates", labelKey: "Vendor Updates" },
];

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
    <span className="text-sm text-[var(--text)]">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
        checked ? "bg-[var(--brand-primary)]" : "bg-[var(--border-strong)]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  </label>
);

const NotificationPreferencesPage: React.FC = () => {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    axiosInstance
      .get<{ success: boolean; preferences: NotificationPreferences }>(
        "/notifications/preferences"
      )
      .then((res) => {
        if (mounted) setPrefs(res.data.preferences);
      })
      .catch(() => toast.error(t("Failed to load preferences")))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [t]);

  const updateChannel = (
    channel: ChannelKey,
    key: keyof NotificationPreferences["emailNotifications"],
    value: boolean
  ) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [channel]: { ...prefs[channel], [key]: value } });
  };

  const updateSms = (key: SmsKey, value: boolean) => {
    if (!prefs) return;
    setPrefs({ ...prefs, smsNotifications: { ...prefs.smsNotifications, [key]: value } });
  };

  const updateFrequency = (frequency: NotificationPreferences["frequency"]) => {
    if (!prefs) return;
    setPrefs({ ...prefs, frequency });
  };

  const updateQuietHours = (patch: Partial<NotificationPreferences["quietHours"]>) => {
    if (!prefs) return;
    setPrefs({ ...prefs, quietHours: { ...prefs.quietHours, ...patch } });
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await axiosInstance.put<{ preferences: NotificationPreferences }>(
        "/notifications/preferences",
        {
          emailNotifications: prefs.emailNotifications,
          pushNotifications: prefs.pushNotifications,
          smsNotifications: prefs.smsNotifications,
          frequency: prefs.frequency,
          quietHours: prefs.quietHours,
        }
      );
      setPrefs(res.data.preferences);
      toast.success(t("Preferences saved"));
    } catch {
      toast.error(t("Failed to save preferences"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
          {t("Notification Preferences")}
        </h1>
        <p className="text-[var(--text-muted)] mb-8">
          {t("Choose which notifications you want to receive and how.")}
        </p>

        {loading || !prefs ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            {t("Loading...")}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Email */}
            <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
              <h2 className="text-lg font-semibold text-[var(--text)] mb-2">
                {t("Email Notifications")}
              </h2>
              <div className="divide-y divide-[var(--border)]">
                {CHANNEL_CATEGORIES.map((cat) => (
                  <Toggle
                    key={`email-${cat.key}`}
                    label={t(cat.labelKey)}
                    checked={prefs.emailNotifications[cat.key]}
                    onChange={(v) => updateChannel("emailNotifications", cat.key, v)}
                  />
                ))}
              </div>
            </section>

            {/* Push */}
            <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
              <h2 className="text-lg font-semibold text-[var(--text)] mb-2">
                {t("Push Notifications")}
              </h2>
              <div className="divide-y divide-[var(--border)]">
                {CHANNEL_CATEGORIES.map((cat) => (
                  <Toggle
                    key={`push-${cat.key}`}
                    label={t(cat.labelKey)}
                    checked={prefs.pushNotifications[cat.key]}
                    onChange={(v) => updateChannel("pushNotifications", cat.key, v)}
                  />
                ))}
              </div>
            </section>

            {/* SMS */}
            <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
              <h2 className="text-lg font-semibold text-[var(--text)] mb-2">
                {t("SMS Notifications")}
              </h2>
              <div className="divide-y divide-[var(--border)]">
                <Toggle
                  label={t("Orders")}
                  checked={prefs.smsNotifications.orders}
                  onChange={(v) => updateSms("orders", v)}
                />
                <Toggle
                  label={t("Account Activity")}
                  checked={prefs.smsNotifications.accountActivity}
                  onChange={(v) => updateSms("accountActivity", v)}
                />
              </div>
            </section>

            {/* Frequency */}
            <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
              <h2 className="text-lg font-semibold text-[var(--text)] mb-4">
                {t("Delivery Frequency")}
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {(["immediate", "daily", "weekly"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => updateFrequency(f)}
                    className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition ${
                      prefs.frequency === f
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-accent)]"
                        : "border-[var(--border)] text-[var(--text)] hover:border-[var(--brand-primary)]"
                    }`}
                  >
                    {t(f.charAt(0).toUpperCase() + f.slice(1))}
                  </button>
                ))}
              </div>
            </section>

            {/* Quiet hours */}
            <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  {t("Quiet Hours")}
                </h2>
                <Toggle
                  label={t("Enabled")}
                  checked={prefs.quietHours.enabled}
                  onChange={(v) => updateQuietHours({ enabled: v })}
                />
              </div>
              {prefs.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm text-[var(--text-muted)] mb-1 block">
                      {t("Start")}
                    </span>
                    <input
                      type="time"
                      value={prefs.quietHours.startTime}
                      onChange={(e) =>
                        updateQuietHours({ startTime: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm text-[var(--text-muted)] mb-1 block">
                      {t("End")}
                    </span>
                    <input
                      type="time"
                      value={prefs.quietHours.endTime}
                      onChange={(e) =>
                        updateQuietHours({ endTime: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] outline-none"
                    />
                  </label>
                </div>
              )}
            </section>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 rounded-lg bg-[var(--brand-primary)] text-white font-semibold hover:bg-[var(--brand-primary-hover)] disabled:opacity-60 transition"
              >
                {saving ? t("Saving...") : t("Save Preferences")}
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default NotificationPreferencesPage;
