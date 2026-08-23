// Accurate (accuratess.com) shipping carrier integration — GraphQL.
// Docs: https://moataz27.github.io/accuratess/accurate-api
//
// Gated behind ACCURATE_USERNAME + ACCURATE_PASSWORD; every public helper is
// fail-safe (returns null / falls back) so checkout and order flows never break
// when the carrier is misconfigured or down, mirroring utils/bosta.js.
//
// Account-specific routing (serviceId, sender location, governorate -> zoneId
// mapping) lives in the AccurateSettings model, editable from the dashboard.
//
// NOTE: the endpoint runs on a non-standard TLS port (8443). If Node rejects the
// certificate, point NODE_EXTRA_CA_CERTS at the carrier's CA bundle — do NOT
// disable TLS verification.
import { getAccurateSettings } from "../models/accurateSettings.model.js";

const ENDPOINT =
  process.env.ACCURATE_API_URL ||
  "https://qimmah.lg.accuratess.com:8443/graphql";

export const isAccurateEnabled = () =>
  !!(process.env.ACCURATE_USERNAME && process.env.ACCURATE_PASSWORD);

// ── GraphQL operations ──────────────────────────────────────────────────────
const LOGIN_MUTATION = /* GraphQL */ `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      expiresAt
    }
  }
`;

const CALC_FEES_QUERY = /* GraphQL */ `
  query CalcFees($input: CalculateShipmentFeesInput!) {
    calculateShipmentFees(input: $input) {
      delivery
      weight
      collection
      post
      tax
      return
      total
    }
  }
`;

const SAVE_SHIPMENT_MUTATION = /* GraphQL */ `
  mutation SaveShipment($input: ShipmentInput!) {
    saveShipment(input: $input) {
      id
      code
      trackingUrl
      status {
        id
        code
        name
      }
    }
  }
`;

const SHIPMENT_QUERY = /* GraphQL */ `
  query Shipment($id: Int, $code: String) {
    shipment(id: $id, code: $code) {
      id
      code
      trackingUrl
      cancelled
      deliveryDate
      deliveredOrReturnedDate
      status {
        id
        code
        name
      }
    }
  }
`;

const LIST_ZONES_QUERY = /* GraphQL */ `
  query ListZones($input: ListZonesFilterInput) {
    listZonesDropdown(input: $input) {
      id
      code
      name
    }
  }
`;

const LIST_SERVICES_QUERY = /* GraphQL */ `
  query ListServices($input: ListShippingServicesFilterInput!) {
    listShippingServicesDropdown(input: $input) {
      id
      code
      name
    }
  }
`;

// ── Transport ───────────────────────────────────────────────────────────────
const request = async (query, variables, token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Accurate non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }

  if (json.errors?.length) {
    const err = new Error(json.errors.map((e) => e.message).join("; "));
    err.graphQLErrors = json.errors;
    throw err;
  }
  return json.data;
};

// ── Auth / token cache ──────────────────────────────────────────────────────
// Cached in module memory; on serverless this is best-effort (per warm
// instance) and we re-login transparently on expiry or auth failure.
let cachedToken = null;
let tokenExpiresAt = 0;

// ttl is documented as a String — could be seconds, epoch ms, or an ISO date.
// Parse defensively and clamp to a sane window.
const parseTtlMs = (ttl) => {
  if (ttl == null) return 3600_000;
  const n = Number(ttl);
  if (Number.isFinite(n) && n > 0) {
    return n > 10_000_000_000 ? n - Date.now() : n * 1000;
  }
  const t = Date.parse(ttl);
  if (!Number.isNaN(t)) return t - Date.now();
  return 3600_000;
};

const login = async (force = false) => {
  if (!isAccurateEnabled()) throw new Error("Accurate is not configured");
  if (!force && cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const data = await request(LOGIN_MUTATION, {
    input: {
      username: process.env.ACCURATE_USERNAME,
      password: process.env.ACCURATE_PASSWORD,
      rememberMe: true,
    },
  });

  const result = data?.login;
  if (!result?.token) throw new Error("Accurate login returned no token");

  cachedToken = result.token;
  const ms = Math.min(Math.max(parseTtlMs(result.expiresAt), 60_000), 86_400_000);
  tokenExpiresAt = Date.now() + ms - 60_000; // 60s safety margin
  return cachedToken;
};

const isAuthError = (err) => {
  const m = (err?.message || "").toLowerCase();
  if (m.includes("unauth") || m.includes("token") || m.includes("forbidden")) {
    return true;
  }
  return !!err?.graphQLErrors?.some((e) =>
    ["UNAUTHENTICATED", "UNAUTHORIZED", "FORBIDDEN"].includes(e?.extensions?.code)
  );
};

// Run an authenticated operation, re-logging in once if the token was rejected.
const authed = async (query, variables) => {
  let token = await login();
  try {
    return await request(query, variables, token);
  } catch (err) {
    if (!isAuthError(err)) throw err;
    token = await login(true);
    return await request(query, variables, token);
  }
};

// ── Zone resolution ─────────────────────────────────────────────────────────
const norm = (s) => String(s || "").trim().toLowerCase();

// Map a free-text address to Accurate zone/subzone IDs using the configured
// mappings. Matches on governorate against the address state, then city.
export const resolveAccurateZone = (settings, address = {}) => {
  const hay = [address.state, address.city].filter(Boolean).map(norm);
  const m = (settings?.mappings || []).find((x) => {
    const g = norm(x.governorate);
    return g && hay.some((h) => h === g || h.includes(g) || g.includes(h));
  });
  return m ? { zoneId: m.zoneId, subzoneId: m.subzoneId } : null;
};

// ── Public API ──────────────────────────────────────────────────────────────

// Live delivery fee (EGP) for an address, or null to fall back to zone rates.
export const getAccurateShippingFee = async (address = {}, price = 0, opts = {}) => {
  if (!isAccurateEnabled()) return null;
  try {
    const settings = await getAccurateSettings();
    if (!settings.enabled || !settings.serviceId) return null;

    const zone = resolveAccurateZone(settings, address);
    if (!zone) return null;

    const data = await authed(CALC_FEES_QUERY, {
      input: {
        serviceId: settings.serviceId,
        recipientZoneId: zone.zoneId,
        recipientSubzoneId: zone.subzoneId,
        senderZoneId: settings.senderZoneId ?? undefined,
        senderSubzoneId: settings.senderSubzoneId ?? undefined,
        price: Number(price) || 0,
        weight: Number(opts.weight) || settings.defaultWeight || 1,
        paymentTypeCode: opts.paymentTypeCode || undefined,
        priceTypeCode: settings.priceTypeCode || undefined,
      },
    });

    const fee = data?.calculateShipmentFees?.total;
    return fee == null ? null : Math.max(0, Number(fee));
  } catch (err) {
    console.error("[Accurate] fee lookup failed, falling back:", err.message);
    return null;
  }
};

// Create a waybill for an order. Throws on failure so callers can surface the
// carrier's message (the auto-create path wraps this in try/catch).
export const createAccurateShipment = async ({ order, address, customer }) => {
  if (!isAccurateEnabled()) throw new Error("Accurate is not configured");
  const settings = await getAccurateSettings();
  if (!settings.enabled) throw new Error("Accurate integration is disabled");
  if (!settings.serviceId) throw new Error("Accurate serviceId is not set");

  const zone = resolveAccurateZone(settings, address);
  if (!zone) {
    const dest = address?.state || address?.city || "this address";
    throw new Error(`No Accurate zone mapping for "${dest}"`);
  }

  const phone = address?.phone || customer?.phoneNumber || "";
  if (!phone) throw new Error("Recipient phone/mobile is required by Accurate");
  if (!address?.address) throw new Error("Recipient address is required by Accurate");

  /*
    COD orders are collected on delivery; prepaid orders carry no collection.

    "Prepaid" has to mean paid *before* the parcel goes out. `!order.isPaid`
    used to be a safe reading of that, because nothing ever set isPaid on a cash
    order. Settling COD at the delivery moment changed it: a delivered cash
    order is now isPaid, so walking its status back to "shipped" — which the
    dashboard permits, there being no transition guard — would have produced a
    waybill marked PAID at price 0 and a courier who collects nothing.

    Paid and not yet delivered is the only combination that means the money is
    already in. Everything else on a cash order is still to collect.
  */
  const prepaid = order.isPaid && !order.isDelivered;
  const isCOD = order.paymentMethod === "cod" && !prepaid;
  const piecesCount =
    order.orderItems?.reduce((n, i) => n + (Number(i.quantity) || 0), 0) || 1;

  const input = {
    serviceId: settings.serviceId,
    typeCode: settings.typeCode || "FDP",
    priceTypeCode: settings.priceTypeCode || "INCLD",
    paymentTypeCode: isCOD ? "COLC" : "PAID",
    price: isCOD ? Number(order.totalPrice) || 0 : 0,
    weight: settings.defaultWeight || 1,
    piecesCount,
    refNumber: String(order._id),
    description: `Order #${String(order._id).slice(-8).toUpperCase()}`,
    recipientName: address?.name || customer?.name || undefined,
    recipientAddress: address.address,
    recipientMobile: phone,
    recipientPhone: phone,
    recipientZoneId: zone.zoneId,
    recipientSubzoneId: zone.subzoneId,
    senderName: settings.senderName || undefined,
    senderAddress: settings.senderAddress || undefined,
    senderMobile: settings.senderMobile || undefined,
    senderPhone: settings.senderPhone || undefined,
    senderZoneId: settings.senderZoneId ?? undefined,
    senderSubzoneId: settings.senderSubzoneId ?? undefined,
  };

  const data = await authed(SAVE_SHIPMENT_MUTATION, { input });
  const s = data?.saveShipment;
  if (!s) throw new Error("Accurate saveShipment returned no data");
  return {
    id: s.id,
    code: s.code,
    trackingUrl: s.trackingUrl,
    status: s.status?.name || null,
    statusCode: s.status?.code || null,
  };
};

// Look up a shipment's current status for tracking sync. Returns null on any
// failure so callers can skip gracefully.
export const getAccurateShipmentStatus = async ({ id, code } = {}) => {
  if (!isAccurateEnabled()) return null;
  if (id == null && !code) return null;
  try {
    const data = await authed(SHIPMENT_QUERY, {
      id: id ?? null,
      code: code ?? null,
    });
    const s = data?.shipment;
    if (!s) return null;
    return {
      id: s.id,
      code: s.code,
      status: s.status?.name || null,
      statusCode: s.status?.code || null,
      cancelled: s.cancelled,
      trackingUrl: s.trackingUrl,
      deliveryDate: s.deliveryDate || null,
      deliveredOrReturnedDate: s.deliveredOrReturnedDate || null,
    };
  } catch (err) {
    console.error("[Accurate] tracking lookup failed:", err.message);
    return null;
  }
};

// Dropdown helpers used by the admin endpoints to build the zone map.
// Call without parentId for top-level zones; pass a zoneId for its subzones.
export const listAccurateZones = async (parentId = null) => {
  if (!isAccurateEnabled()) throw new Error("Accurate is not configured");
  const input = {};
  if (parentId != null && parentId !== "") input.parentId = Number(parentId);
  const data = await authed(LIST_ZONES_QUERY, { input });
  return data?.listZonesDropdown || [];
};

export const listAccurateServices = async () => {
  if (!isAccurateEnabled()) throw new Error("Accurate is not configured");
  const data = await authed(LIST_SERVICES_QUERY, { input: { active: true } });
  return data?.listShippingServicesDropdown || [];
};
