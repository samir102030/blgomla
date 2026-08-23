// Shared shipping-fee resolver. The frontend mirrors this logic for display,
// but the order controller is authoritative (it recomputes server-side).
//
// Rules, in order:
//  - shipping disabled            → 0
//  - subtotal >= free threshold   → 0  (threshold > 0)
//  - a zone matches the address   → that zone's fee
//  - otherwise                    → defaultFee
const norm = (s) => String(s || "").trim().toLowerCase();

/**
 * Which configured zone an address falls in.
 *
 * `rows` is anything carrying a `governorate` — the fee table here, and the
 * carrier's zone mappings in utils/accurate.js, which held a byte-identical
 * copy of the old test.
 *
 * The old test was `h === g || h.includes(g) || g.includes(h)` over both the
 * state and the city at once, resolved by whichever row happened to come first
 * in the operator's table. Two things went wrong with that:
 *
 *   The city could beat the state. An address in Cairo with a city that
 *   happened to contain another governorate's name took that governorate's fee,
 *   depending only on row order.
 *
 *   Containment ran both ways. A zone named "New Cairo" matched an address
 *   whose state is plainly "Cairo", because the zone name contains it — so a
 *   Cairo customer could be charged the New Cairo rate. The reverse is the one
 *   that is wanted: an address in "New Cairo" should fall into a "Cairo" zone.
 *
 * Precedence is now explicit and independent of row order: an exact state
 * match, then an exact city match, then a state that contains a zone name, then
 * a city that does. Longest zone name first within the containment passes, so
 * "New Cairo" beats "Cairo" for an address that names both.
 *
 * No zones are configured yet, so nothing changes today. This is the last
 * moment it can be corrected without moving somebody's prices.
 */
export const matchZone = (rows, address = {}) => {
  const candidates = (rows || []).filter((row) => norm(row?.governorate));
  if (!candidates.length) return null;

  const state = norm(address.state);
  const city = norm(address.city);

  const exact = (value) =>
    value ? candidates.find((row) => norm(row.governorate) === value) : undefined;

  const byLength = [...candidates].sort(
    (a, b) => norm(b.governorate).length - norm(a.governorate).length
  );
  const contains = (value) =>
    value ? byLength.find((row) => value.includes(norm(row.governorate))) : undefined;

  return exact(state) || exact(city) || contains(state) || contains(city) || null;
};

export const resolveShippingFee = (settings, address = {}, subtotal = 0) => {
  if (!settings || settings.enabled === false) return 0;

  const threshold = Number(settings.freeShippingThreshold) || 0;
  if (threshold > 0 && Number(subtotal) >= threshold) return 0;

  const zone = matchZone(settings.zones, address);

  return Math.max(0, Number(zone ? zone.fee : settings.defaultFee) || 0);
};
