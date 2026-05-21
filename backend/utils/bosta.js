// Bosta live shipping rates (https://bosta.co) — optional. Gated behind
// BOSTA_API_KEY; returns null on any failure so the caller falls back to the
// admin-configured zone rates (utils/shipping.js). Nothing breaks without a key.
//
// NOTE: confirm the exact pricing endpoint + response field against your Bosta
// account/API version before relying on live rates. The defaults below follow
// Bosta's delivery pricing API shape; override with BOSTA_API_URL /
// BOSTA_PICKUP_CITY if your account differs. Until verified, the resolver still
// falls back to your zone rates, so checkout always has a valid fee.
const BASE = process.env.BOSTA_API_URL || "https://app.bosta.co/api/v2";

export const isBostaEnabled = () => !!process.env.BOSTA_API_KEY;

/**
 * Fetch a live delivery fee for an address. Returns a number (EGP) or null.
 * @param {{city?: string, state?: string}} address
 */
export const getBostaShippingFee = async (address = {}) => {
  const key = process.env.BOSTA_API_KEY;
  if (!key) return null;

  const dropOffCity = address.state || address.city;
  if (!dropOffCity) return null;

  try {
    const res = await fetch(`${BASE}/pricing/shipment/calculator`, {
      method: "POST",
      headers: {
        Authorization: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dropOffCity,
        pickupCity: process.env.BOSTA_PICKUP_CITY || "Cairo",
        type: "SEND",
        cod: 0,
      }),
    });
    if (!res.ok) throw new Error(`Bosta ${res.status}`);
    const data = await res.json();

    // Bosta returns the total under a priceBreakdown/tier; be defensive about
    // the exact shape across API versions.
    const fee =
      data?.data?.priceAfterVat ??
      data?.priceAfterVat ??
      data?.data?.tier?.cost ??
      data?.tier?.cost ??
      data?.data?.totalPrice ??
      null;

    return fee == null ? null : Math.max(0, Number(fee));
  } catch (err) {
    console.error("[Bosta] rate lookup failed, falling back:", err.message);
    return null;
  }
};
