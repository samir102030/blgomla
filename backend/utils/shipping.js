// Shared shipping-fee resolver. The frontend mirrors this logic for display,
// but the order controller is authoritative (it recomputes server-side).
//
// Rules, in order:
//  - shipping disabled            → 0
//  - subtotal >= free threshold   → 0  (threshold > 0)
//  - a zone matches the address   → that zone's fee
//  - otherwise                    → defaultFee
export const resolveShippingFee = (settings, address = {}, subtotal = 0) => {
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
