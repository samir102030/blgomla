// Mirror of backend utils/shipping.js — used for display at checkout. The order
// controller recomputes the fee authoritatively on submit.
export interface ShippingZone {
  governorate: string;
  fee: number;
  /*
    A zone may override the shop-wide delivery window. Declared here because
    they exist on the API and this type was the reason they were being thrown
    away: the admin page mapped each zone to {governorate, fee} on save, the
    server rewrote the two absent fields to null, and a per-zone window set by
    anything else vanished on the next save with nothing to show for it.
  */
  deliveryDaysMin?: number | null;
  deliveryDaysMax?: number | null;
}

export interface ShippingSettings {
  enabled: boolean;
  defaultFee: number;
  freeShippingThreshold: number;
  deliveryDaysMin?: number;
  deliveryDaysMax?: number;
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

  const zone = matchZone(settings.zones, address);

  return Math.max(0, Number(zone ? zone.fee : settings.defaultFee) || 0);
};

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

/**
 * Which configured zone an address falls in. Mirrors backend utils/shipping.js
 * exactly — the two have to agree, or the cart quotes one number and checkout
 * charges another.
 *
 * The old test was `h === g || h.includes(g) || g.includes(h)` over the state
 * and the city at once, resolved by whichever row came first in the operator's
 * table. The city could beat the state, and containment ran both ways — so a
 * zone named "New Cairo" matched an address whose state is plainly "Cairo".
 *
 * Precedence is explicit now: exact state, exact city, state containing a zone
 * name, city containing one; longest zone name first within the containment
 * passes, so "New Cairo" beats "Cairo" for an address that names both.
 */
export const matchZone = <T extends { governorate?: string }>(
  rows: T[] | null | undefined,
  address: AddressLike = {}
): T | null => {
  const candidates = (rows || []).filter((row) => norm(row?.governorate));
  if (!candidates.length) return null;

  const state = norm(address.state);
  const city = norm(address.city);

  const exact = (value: string) =>
    value ? candidates.find((row) => norm(row.governorate) === value) : undefined;

  const byLength = [...candidates].sort(
    (a, b) => norm(b.governorate).length - norm(a.governorate).length
  );
  const contains = (value: string) =>
    value ? byLength.find((row) => value.includes(norm(row.governorate))) : undefined;

  return exact(state) || exact(city) || contains(state) || contains(city) || null;
};
