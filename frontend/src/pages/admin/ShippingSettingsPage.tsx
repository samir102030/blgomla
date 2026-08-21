import React, { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import type { ShippingSettings, ShippingZone } from "../../lib/shipping";
import { GovernorateDatalist } from "../../components/GovernorateSelect";

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]";

const ShippingSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ShippingSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance
      .get<{ success: boolean; settings: ShippingSettings }>("/shipping")
      .then((res) => setSettings(res.data.settings))
      .catch(() => toast.error(t("Couldn't load shipping settings")));
  }, [t]);

  if (!settings) {
    return <div className="p-6 text-[var(--text-muted)]">{t("Loading…")}</div>;
  }

  const update = (patch: Partial<ShippingSettings>) =>
    setSettings({ ...settings, ...patch });

  const updateZone = (i: number, patch: Partial<ShippingZone>) => {
    const zones = settings.zones.map((z, idx) => (idx === i ? { ...z, ...patch } : z));
    update({ zones });
  };
  const addZone = () =>
    update({ zones: [...settings.zones, { governorate: "", fee: 0 }] });
  const removeZone = (i: number) =>
    update({ zones: settings.zones.filter((_, idx) => idx !== i) });

  const save = async () => {
    setSaving(true);
    try {
      const res = await axiosInstance.put<{ success: boolean; settings: ShippingSettings }>(
        "/shipping",
        {
          enabled: settings.enabled,
          defaultFee: Number(settings.defaultFee) || 0,
          freeShippingThreshold: Number(settings.freeShippingThreshold) || 0,
          zones: settings.zones
            .filter((z) => z.governorate.trim())
            .map((z) => ({ governorate: z.governorate.trim(), fee: Number(z.fee) || 0 })),
        }
      );
      setSettings(res.data.settings);
      toast.success(t("Shipping settings saved"));
    } catch {
      toast.error(t("Couldn't save shipping settings"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <GovernorateDatalist id="shipping-governorates" />
      <h1 className="text-2xl font-bold text-[var(--text)] mb-1">
 {t("admin.shipping", "Shipping")}
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        {t("Set delivery fees by governorate. Orders use these rates at checkout.")}
      </p>

      <label className="flex items-center gap-2 mb-5">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          className="rounded border-gray-300 text-[var(--brand-primary)]"
        />
        <span className="text-sm font-medium text-[var(--text)]">
          {t("Charge shipping")}
        </span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <label className="block">
          <span className="block text-sm font-semibold text-[var(--text)] mb-1">
            {t("Default fee (EGP)")}
          </span>
          <input
            type="number"
            min={0}
            value={settings.defaultFee}
            onChange={(e) => update({ defaultFee: Number(e.target.value) })}
            className={inputCls}
          />
          <span className="block text-xs text-[var(--text-muted)] mt-1">
            {t("Used when no governorate rate matches.")}
          </span>
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-[var(--text)] mb-1">
            {t("Free shipping over (EGP)")}
          </span>
          <input
            type="number"
            min={0}
            value={settings.freeShippingThreshold}
            onChange={(e) => update({ freeShippingThreshold: Number(e.target.value) })}
            className={inputCls}
          />
          <span className="block text-xs text-[var(--text-muted)] mt-1">
            {t("0 disables free shipping.")}
          </span>
        </label>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[var(--text)]">
            {t("Per-governorate rates")}
          </h2>
          <button
            type="button"
            onClick={addZone}
            className="text-xs font-medium text-[var(--brand-primary)] hover:underline"
          >
            + {t("Add zone")}
          </button>
        </div>
        {settings.zones.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">
            {t("No zones — all orders use the default fee.")}
          </p>
        ) : (
          <div className="space-y-2">
            {settings.zones.map((z, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  list="shipping-governorates"
                  value={z.governorate}
                  onChange={(e) => updateZone(i, { governorate: e.target.value })}
                  placeholder={t("Governorate (e.g. Cairo)")}
                  className={inputCls}
                />
                <input
                  type="number"
                  min={0}
                  value={z.fee}
                  onChange={(e) => updateZone(i, { fee: Number(e.target.value) })}
                  placeholder={t("Fee")}
                  className="w-28 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                />
                <button
                  type="button"
                  onClick={() => removeZone(i)}
                  className="text-red-500 hover:text-red-600 text-sm px-2"
                  aria-label={t("Remove zone")}
                >
                  <XMarkIcon className="w-6 h-6" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="px-5 py-2.5 rounded-lg bg-[var(--brand-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
      >
        {saving ? t("Saving…") : t("Save changes")}
      </button>
    </div>
  );
};

export default ShippingSettingsPage;
