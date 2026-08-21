import React, { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import {
  type AccurateSettings,
  type AccurateMapping,
  type DropDownEntry,
  SHIPMENT_TYPE_CODES,
  PRICE_TYPE_CODES,
} from "../../lib/accurate";
import { GovernorateDatalist } from "../../components/GovernorateSelect";

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]";

const numOrNull = (v: string): number | null =>
  v.trim() === "" ? null : Number(v);

const AccurateSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AccurateSettings | null>(null);
  const [credsOk, setCredsOk] = useState(false);
  const [saving, setSaving] = useState(false);

  // Lookup helpers (only usable once credentials are configured).
  const [services, setServices] = useState<DropDownEntry[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [zones, setZones] = useState<DropDownEntry[]>([]);
  const [zoneParent, setZoneParent] = useState("");
  const [loadingZones, setLoadingZones] = useState(false);

  useEffect(() => {
    axiosInstance
      .get<{
        success: boolean;
        settings: AccurateSettings;
        credentialsConfigured: boolean;
      }>("/accurate/settings")
      .then((res) => {
        setSettings(res.data.settings);
        setCredsOk(res.data.credentialsConfigured);
      })
      .catch(() => toast.error(t("Couldn't load Accurate settings")));
  }, [t]);

  if (!settings) {
    return <div className="p-6 text-[var(--text-muted)]">{t("Loading…")}</div>;
  }

  const update = (patch: Partial<AccurateSettings>) =>
    setSettings({ ...settings, ...patch });

  const updateMapping = (i: number, patch: Partial<AccurateMapping>) =>
    update({
      mappings: settings.mappings.map((m, idx) =>
        idx === i ? { ...m, ...patch } : m
      ),
    });
  const addMapping = () =>
    update({
      mappings: [...settings.mappings, { governorate: "", zoneId: 0, subzoneId: 0 }],
    });
  const removeMapping = (i: number) =>
    update({ mappings: settings.mappings.filter((_, idx) => idx !== i) });

  const loadServices = async () => {
    setLoadingServices(true);
    try {
      const res = await axiosInstance.get<{ success: boolean; services: DropDownEntry[] }>(
        "/accurate/services"
      );
      setServices(res.data.services || []);
      if (!res.data.services?.length) toast(t("No services returned"));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || t("Couldn't load services");
      toast.error(msg);
    } finally {
      setLoadingServices(false);
    }
  };

  const loadZones = async () => {
    setLoadingZones(true);
    try {
      const res = await axiosInstance.get<{ success: boolean; zones: DropDownEntry[] }>(
        "/accurate/zones",
        { params: zoneParent.trim() ? { parentId: zoneParent.trim() } : {} }
      );
      setZones(res.data.zones || []);
      if (!res.data.zones?.length) toast(t("No zones returned"));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || t("Couldn't load zones");
      toast.error(msg);
    } finally {
      setLoadingZones(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await axiosInstance.put<{ success: boolean; settings: AccurateSettings }>(
        "/accurate/settings",
        {
          enabled: settings.enabled,
          serviceId: settings.serviceId ?? null,
          senderName: settings.senderName || "",
          senderPhone: settings.senderPhone || "",
          senderMobile: settings.senderMobile || "",
          senderAddress: settings.senderAddress || "",
          senderZoneId: settings.senderZoneId ?? null,
          senderSubzoneId: settings.senderSubzoneId ?? null,
          typeCode: settings.typeCode,
          priceTypeCode: settings.priceTypeCode,
          defaultWeight: Number(settings.defaultWeight) || 0,
          mappings: settings.mappings
            .filter((m) => m.governorate.trim())
            .map((m) => ({
              governorate: m.governorate.trim(),
              zoneId: Number(m.zoneId) || 0,
              subzoneId: Number(m.subzoneId) || 0,
            })),
        }
      );
      setSettings(res.data.settings);
      toast.success(t("Accurate settings saved"));
    } catch {
      toast.error(t("Couldn't save Accurate settings"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <GovernorateDatalist id="accurate-governorates" />
      <h1 className="text-2xl font-bold text-[var(--text)] mb-1">
 {t("Accurate shipping")}
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        {t(
          "Live rates and waybills via the Accurate carrier. When enabled it takes priority over Bosta, then falls back to the zone rates."
        )}
      </p>

      {!credsOk && (
        <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
          {t(
            "Carrier credentials are not configured yet. Set ACCURATE_USERNAME and ACCURATE_PASSWORD on the server to enable live calls. You can still prepare the settings below."
          )}
        </div>
      )}

      <label className="flex items-center gap-2 mb-6">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          className="rounded border-gray-300 text-[var(--brand-primary)]"
        />
        <span className="text-sm font-medium text-[var(--text)]">
          {t("Enable Accurate")}
        </span>
      </label>

      {/* ── Service ──────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-2">
          {t("Shipping service")}
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-xs text-[var(--text-muted)] mb-1">
              {t("Service ID")}
            </span>
            <input
              type="number"
              value={settings.serviceId ?? ""}
              onChange={(e) => update({ serviceId: numOrNull(e.target.value) })}
              className="w-32 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
            />
          </label>
          <button
            type="button"
            onClick={loadServices}
            disabled={!credsOk || loadingServices}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            {loadingServices ? t("Loading…") : t("Load services")}
          </button>
          {services.length > 0 && (
            <select
              onChange={(e) => update({ serviceId: numOrNull(e.target.value) })}
              value={settings.serviceId ?? ""}
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
            >
              <option value="">{t("Pick a service…")}</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.code} (#{s.id})
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {/* ── Sender / pickup ──────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-2">
          {t("Pickup / sender")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={settings.senderName || ""}
            onChange={(e) => update({ senderName: e.target.value })}
            placeholder={t("Sender name")}
            className={inputCls}
          />
          <input
            type="text"
            value={settings.senderAddress || ""}
            onChange={(e) => update({ senderAddress: e.target.value })}
            placeholder={t("Sender address")}
            className={inputCls}
          />
          <input
            type="text"
            value={settings.senderMobile || ""}
            onChange={(e) => update({ senderMobile: e.target.value })}
            placeholder={t("Sender mobile")}
            className={inputCls}
          />
          <input
            type="text"
            value={settings.senderPhone || ""}
            onChange={(e) => update({ senderPhone: e.target.value })}
            placeholder={t("Sender phone")}
            className={inputCls}
          />
          <input
            type="number"
            value={settings.senderZoneId ?? ""}
            onChange={(e) => update({ senderZoneId: numOrNull(e.target.value) })}
            placeholder={t("Sender zone ID")}
            className={inputCls}
          />
          <input
            type="number"
            value={settings.senderSubzoneId ?? ""}
            onChange={(e) => update({ senderSubzoneId: numOrNull(e.target.value) })}
            placeholder={t("Sender subzone ID")}
            className={inputCls}
          />
        </div>
      </section>

      {/* ── Defaults ─────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-2">
          {t("Shipment defaults")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-xs text-[var(--text-muted)] mb-1">
              {t("Type code")}
            </span>
            <select
              value={settings.typeCode}
              onChange={(e) =>
                update({ typeCode: e.target.value as AccurateSettings["typeCode"] })
              }
              className={inputCls}
            >
              {SHIPMENT_TYPE_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-[var(--text-muted)] mb-1">
              {t("Price type")}
            </span>
            <select
              value={settings.priceTypeCode}
              onChange={(e) =>
                update({
                  priceTypeCode: e.target.value as AccurateSettings["priceTypeCode"],
                })
              }
              className={inputCls}
            >
              {PRICE_TYPE_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-[var(--text-muted)] mb-1">
              {t("Default weight (kg)")}
            </span>
            <input
              type="number"
              min={0}
              step="0.1"
              value={settings.defaultWeight}
              onChange={(e) => update({ defaultWeight: Number(e.target.value) })}
              className={inputCls}
            />
          </label>
        </div>
      </section>

      {/* ── Zone lookup helper ───────────────────────────────── */}
      <section className="mb-6 rounded-lg border border-[var(--border)] p-3">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-1">
          {t("Zone lookup")}
        </h2>
        <p className="text-xs text-[var(--text-muted)] mb-2">
          {t(
            "Find the numeric IDs for the map below. Leave parent empty for governorate-level zones, or enter a zone ID to list its subzones."
          )}
        </p>
        <div className="flex flex-wrap items-end gap-2 mb-2">
          <input
            type="number"
            value={zoneParent}
            onChange={(e) => setZoneParent(e.target.value)}
            placeholder={t("Parent zone ID (optional)")}
            className="w-48 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
          />
          <button
            type="button"
            onClick={loadZones}
            disabled={!credsOk || loadingZones}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            {loadingZones ? t("Loading…") : t("Fetch zones")}
          </button>
        </div>
        {zones.length > 0 && (
          <div className="max-h-48 overflow-y-auto text-xs border-t border-[var(--border)] pt-2">
            {zones.map((z) => (
              <div
                key={z.id}
                className="flex justify-between py-0.5 text-[var(--text-muted)]"
              >
                <span>{z.name || z.code}</span>
                <span className="font-mono">#{z.id}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Governorate → zone map ───────────────────────────── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[var(--text)]">
            {t("Governorate → zone map")}
          </h2>
          <button
            type="button"
            onClick={addMapping}
            className="text-xs font-medium text-[var(--brand-primary)] hover:underline"
          >
            + {t("Add mapping")}
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-2">
          {t(
            "Each customer address is matched by governorate to find the Accurate zone. Without a match, the order falls back to Bosta/zone rates."
          )}
        </p>
        {settings.mappings.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">
            {t("No mappings yet — add one per governorate you ship to.")}
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2 text-[11px] text-[var(--text-muted)] px-1">
              <span className="flex-1">{t("Governorate")}</span>
              <span className="w-28">{t("Zone ID")}</span>
              <span className="w-28">{t("Subzone ID")}</span>
              <span className="w-6" />
            </div>
            {settings.mappings.map((m, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  list="accurate-governorates"
                  value={m.governorate}
                  onChange={(e) => updateMapping(i, { governorate: e.target.value })}
                  placeholder={t("e.g. Cairo")}
                  className={inputCls}
                />
                <input
                  type="number"
                  value={m.zoneId || ""}
                  onChange={(e) => updateMapping(i, { zoneId: Number(e.target.value) })}
                  className="w-28 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                />
                <input
                  type="number"
                  value={m.subzoneId || ""}
                  onChange={(e) =>
                    updateMapping(i, { subzoneId: Number(e.target.value) })
                  }
                  className="w-28 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                />
                <button
                  type="button"
                  onClick={() => removeMapping(i)}
                  className="text-red-500 hover:text-red-600 text-sm px-2"
                  aria-label={t("Remove mapping")}
                >
                  <XMarkIcon className="w-6 h-6" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

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

export default AccurateSettingsPage;
