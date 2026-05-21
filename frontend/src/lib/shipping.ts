// Mirror of backend utils/shipping.js — used for display at checkout. The order
// controller recomputes the fee authoritatively on submit.
export interface ShippingZone {
  governorate: string;
  fee: number;
}

export interface ShippingSettings {
  enabled: boolean;
  defaultFee: number;
  freeShippingThreshold: number;
  zones: ShippingZone[];
}

interface AddressLike {
  city?: string;
  state?: string;
}

export const resolveShippingFee = (
  settings: ShippingSettings | null | undefined,
  address: AddressLike = {},
  subtotal = 0
): number => {
  if (!settings || settings.enabled === false) return 0;

  const threshold = Number(settings.freeShippingThreshold) || 0;
  if (threshold > 0 && Number(subtotal) >= threshold) return 0;

  const hay = [address.state, address.city]
    .filter(Boolean)
    .map((s) => String(s).trim().toLowerCase());

  const zone = (settings.zones || []).find((z) => {
    const g = String(z.governorate || "").trim().toLowerCase();
    return g && hay.some((h) => h === g || h.includes(g) || g.includes(h));
  });

  return Math.max(0, Number(zone ? zone.fee : settings.defaultFee) || 0);
};
