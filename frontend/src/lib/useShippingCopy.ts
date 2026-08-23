import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "./axios";
import type { ShippingSettings } from "./shipping";

/**
 * What the shop can honestly say about delivery, read from what it charges.
 *
 * Three pages promised "free shipping on all orders over 5,000 EGP" — the FAQ,
 * the services strip on the home page, and clause 5 of the Terms of Service —
 * and the figure was a literal in each of them, wired to nothing. The live
 * setting is freeShippingThreshold 0 with defaultFee 0, so today everything
 * ships free and the promise happens to be honoured by accident.
 *
 * It stops being an accident the moment somebody enters a real fee. Without a
 * threshold entered in the same edit, the shop starts charging delivery on a
 * 20,000 EGP order while three pages, one of them contractual, say it is free.
 *
 * So the sentence is derived rather than written. Three cases, and each is the
 * truth about a different configuration:
 *
 *   a threshold is set        -> free above that figure
 *   no threshold, nothing to charge -> free, everywhere, full stop
 *   no threshold, a fee       -> no free-shipping claim at all
 *
 * The delivery window comes from the same place, so "2-5 business days" also
 * stops being a guess that outlives the setting.
 *
 * Cached at module scope: three components ask on the same page load, the
 * answer is one small document, and it changes when an operator saves the
 * Shipping page.
 */

let cached: ShippingSettings | null = null;
let inFlight: Promise<ShippingSettings | null> | null = null;

const load = async (): Promise<ShippingSettings | null> => {
  if (cached) return cached;
  if (!inFlight) {
    inFlight = axiosInstance
      .get<{ success: boolean; settings: ShippingSettings }>("/shipping")
      .then((res) => {
        cached = res.data?.settings ?? null;
        return cached;
      })
      .catch(() => null)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
};

export interface ShippingCopy {
  /** True while nothing is known yet, so a page can hold the claim back. */
  loading: boolean;
  /** Whether the shop can say anything about free delivery at all. */
  hasFreeShipping: boolean;
  /** The threshold, 0 when delivery is simply free. */
  threshold: number;
  daysMin: number;
  daysMax: number;
  /** One sentence about delivery cost, or "" when there is nothing to claim. */
  freeShippingLine: string;
  /** One sentence about how long it takes. */
  deliveryLine: string;
}

export const useShippingCopy = (): ShippingCopy => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ShippingSettings | null>(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let alive = true;
    load().then((s) => {
      if (!alive) return;
      setSettings(s);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const threshold = Number(settings?.freeShippingThreshold) || 0;
  const defaultFee = Number(settings?.defaultFee) || 0;
  const zones = settings?.zones || [];
  const daysMin = Number((settings as { deliveryDaysMin?: number } | null)?.deliveryDaysMin) || 2;
  const daysMax = Number((settings as { deliveryDaysMax?: number } | null)?.deliveryDaysMax) || 5;

  // "Nothing to charge" has to account for the zone table as well: a default of
  // zero with per-governorate fees behind it is not free delivery, it is free
  // for the governorates nobody has priced.
  const chargesNothing =
    settings?.enabled === false ||
    (defaultFee === 0 && !zones.some((z) => Number(z.fee) > 0));

  const amount = `${threshold.toLocaleString()} ${t("EGP")}`;

  let freeShippingLine = "";
  let hasFreeShipping = false;
  if (threshold > 0) {
    hasFreeShipping = true;
    freeShippingLine = t("Orders over {{amount}} ship free.", { amount });
  } else if (chargesNothing) {
    hasFreeShipping = true;
    freeShippingLine = t("Delivery is free anywhere in Egypt.");
  }

  return {
    loading,
    hasFreeShipping,
    threshold,
    daysMin,
    daysMax,
    freeShippingLine,
    deliveryLine: t("Delivery takes {{min}}–{{max}} business days.", {
      min: daysMin,
      max: daysMax,
    }),
  };
};

export default useShippingCopy;
