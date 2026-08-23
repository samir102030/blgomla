import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../lib/axios";

interface ShippingZone {
  governorate: string;
  fee: number;
  deliveryDaysMin?: number | null;
  deliveryDaysMax?: number | null;
}

interface ShippingSettings {
  enabled: boolean;
  defaultFee: number;
  freeShippingThreshold: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  zones: ShippingZone[];
}

interface DeliveryEstimateProps {
  /**
   * Optional governorate to use per-zone overrides (only set on cart/checkout
   * once an address is selected). On PDP we omit it and use the defaults.
   */
  governorate?: string;
  /** Compact rendering for tight surfaces (cart row, checkout summary). */
  compact?: boolean;
  /** Override the leading icon. Defaults to a truck. */
  icon?: React.ReactNode;
  className?: string;
}

// Module-scoped cache so repeated mounts (one per PDP/cart visit) don't refetch.
let cached: ShippingSettings | null = null;
let inflight: Promise<ShippingSettings | null> | null = null;

const loadSettings = async (): Promise<ShippingSettings | null> => {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data } = await axiosInstance.get("/shipping");
      cached = (data?.settings as ShippingSettings) || null;
      return cached;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
};

// Add `days` business days (skipping Friday — the weekend in Egypt) to `start`.
// Defensive: if the loop somehow doesn't terminate we cap at 60 iterations.
const addBusinessDays = (start: Date, days: number): Date => {
  const d = new Date(start);
  let added = 0;
  let guard = 0;
  while (added < days && guard < 60) {
    d.setDate(d.getDate() + 1);
    // Friday = 5, Saturday = 6. Egypt's weekend is Fri+Sat — skip both.
    const wd = d.getDay();
    if (wd !== 5 && wd !== 6) added += 1;
    guard += 1;
  }
  return d;
};

const TruckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 7h11v8H3V7zm11 3h4l3 3v2h-7v-5zM5 17a2 2 0 104 0 2 2 0 00-4 0zm10 0a2 2 0 104 0 2 2 0 00-4 0z"
    />
  </svg>
);

const DeliveryEstimate: React.FC<DeliveryEstimateProps> = ({
  governorate,
  compact = false,
  icon,
  className = "",
}) => {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<ShippingSettings | null>(cached);

  useEffect(() => {
    if (!cached) loadSettings().then(setSettings);
  }, []);

  if (!settings || settings.enabled === false) return null;

  // Per-zone override > top-level default. Both fields are optional on zones.
  const zone = governorate
    ? settings.zones.find(
        (z) => z.governorate.toLowerCase() === governorate.toLowerCase()
      )
    : null;
  const min =
    (zone?.deliveryDaysMin != null && zone.deliveryDaysMin > 0
      ? zone.deliveryDaysMin
      : settings.deliveryDaysMin) || 2;
  const max =
    (zone?.deliveryDaysMax != null && zone.deliveryDaysMax > 0
      ? zone.deliveryDaysMax
      : settings.deliveryDaysMax) || Math.max(min + 2, 5);

  const now = new Date();
  const earliest = addBusinessDays(now, min);
  const latest = addBusinessDays(now, max);

  const locale = i18n.language === "ar" ? "ar-EG" : "en-US";
  const fmt = (d: Date) =>
    d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });

  // Same-day window → just show one date. Otherwise a range.
  const dateRange =
    earliest.toDateString() === latest.toDateString()
      ? fmt(earliest)
      : `${fmt(earliest)} – ${fmt(latest)}`;

  /*
    "Free delivery" only when delivery is free for everybody.

    This asked whether the default fee was zero and stopped there, so under the
    intended setup — a default of 0 with per-governorate rates behind it — the
    product page promised free delivery to every governorate, including the
    priced ones. The zone table has to be part of the question.
  */
  const anyZoneCharges = (settings.zones || []).some((z) => Number(z.fee) > 0);
  const free =
    settings.freeShippingThreshold > 0
      ? ""
      : settings.defaultFee === 0 && !anyZoneCharges
        ? t("Free delivery")
        : "";

  const label = compact
    ? t("Get it by {{date}}", { date: dateRange })
    : free
      ? `${free} — ${t("Get it by {{date}}", { date: dateRange })}`
      : t("Get it by {{date}}", { date: dateRange });

  return (
    <div
      className={`inline-flex items-center gap-2 text-sm ${
        compact ? "text-[var(--text-muted)]" : "text-[var(--text)]"
      } ${className}`}
    >
      <span className="text-emerald-600 dark:text-emerald-400 shrink-0">
        {icon ?? <TruckIcon className="w-4 h-4" />}
      </span>
      <span className={compact ? "" : "font-medium"}>{label}</span>
    </div>
  );
};

export default DeliveryEstimate;
