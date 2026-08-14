import Stripe from "stripe";
import crypto from "crypto";

/* ─────────────────────────────────────────────────
   STRIPE INTEGRATION (International Payments)
   ───────────────────────────────────────────────── */

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-12-18.acacia",
  });
}

/**
 * Create a Stripe Payment Intent
 * @param {number} amount - Amount in EGP (will be converted to piasters)
 * @param {string} currency - Currency code (default: "egp")
 * @param {object} metadata - Order metadata
 */
export const createStripePaymentIntent = async (amount, currency = "egp", metadata = {}) => {
  if (!stripe) throw new Error("Stripe is not configured");

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to smallest unit (piasters for EGP)
    currency,
    metadata,
    automatic_payment_methods: { enabled: true },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
};

/**
 * Verify a Stripe webhook event
 */
export const verifyStripeWebhook = (payload, signature) => {
  if (!stripe) throw new Error("Stripe is not configured");
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
};

/**
 * Retrieve a Stripe Payment Intent
 */
export const getStripePaymentIntent = async (paymentIntentId) => {
  if (!stripe) throw new Error("Stripe is not configured");
  return stripe.paymentIntents.retrieve(paymentIntentId);
};

/* ─────────────────────────────────────────────────
   PAYMOB INTEGRATION (Egypt Payments)
   ───────────────────────────────────────────────── */

const PAYMOB_BASE = "https://accept.paymob.com/api";

/**
 * Which Paymob channel should serve this payment method.
 *
 * Prefers the channel an admin marked active in the dashboard; falls back to
 * the environment variables that were the only source before, so a deployment
 * with no channels configured keeps working exactly as it did.
 *
 * Only ever returns *which* gateway and page to use. The amount and the order
 * reference are computed per order by the caller and travel to Paymob with
 * the payment key — a channel cannot influence either, which is what keeps
 * the customer charged their real total and the webhook able to find the
 * order it belongs to.
 */
const resolvePaymobChannel = async (method) => {
  const envFallback =
    method === "installment"
      ? {
          integrationId: process.env.PAYMOB_INSTALLMENT_INTEGRATION_ID,
          iframeId:
            process.env.PAYMOB_INSTALLMENT_IFRAME_ID || process.env.PAYMOB_IFRAME_ID,
        }
      : {
          integrationId: process.env.PAYMOB_INTEGRATION_ID,
          iframeId: process.env.PAYMOB_IFRAME_ID,
        };

  try {
    const { default: PaymobChannel } = await import(
      "../models/paymobChannel.model.js"
    );
    const channel = await PaymobChannel.findOne({ method, isActive: true }).select(
      "+apiKeyEnc integrationId iframeId"
    );
    if (!channel) return envFallback;

    let apiKey;
    if (channel.apiKeyEnc) {
      const { decryptSecret } = await import("./secretBox.js");
      apiKey = decryptSecret(channel.apiKeyEnc);
    }

    return {
      integrationId: channel.integrationId,
      iframeId: channel.iframeId,
      apiKey,
    };
  } catch (err) {
    // A database hiccup here must not take checkout down with it — the
    // environment values still describe a working gateway.
    console.error("[paymob] channel lookup failed, using env config:", err.message);
    return envFallback;
  }
};

/**
 * Step 1: Get Paymob authentication token
 */
const getPaymobAuthToken = async (apiKey) => {
  const res = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey || process.env.PAYMOB_API_KEY }),
  });
  const data = await res.json();
  return data.token;
};

/**
 * Step 2: Create Paymob order
 */
const createPaymobOrder = async (authToken, amount, orderId, items = []) => {
  const res = await fetch(`${PAYMOB_BASE}/ecommerce/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: Math.round(amount * 100),
      currency: "EGP",
      merchant_order_id: orderId,
      items: items.map((item) => ({
        name: item.name || "Product",
        amount_cents: Math.round(item.price * 100),
        quantity: item.quantity,
      })),
    }),
  });
  return res.json();
};

/**
 * Step 3: Get Paymob payment key
 */
const getPaymobPaymentKey = async (authToken, orderId, amountCents, billingData, integrationId) => {
  const res = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: orderId,
      billing_data: {
        apartment: billingData.apartment || "NA",
        email: billingData.email,
        floor: billingData.floor || "NA",
        first_name: billingData.firstName,
        street: billingData.street || "NA",
        building: billingData.building || "NA",
        phone_number: billingData.phone,
        shipping_method: "NA",
        postal_code: billingData.postalCode || "NA",
        city: billingData.city || "NA",
        country: billingData.country || "EG",
        last_name: billingData.lastName || "NA",
        state: billingData.state || "NA",
      },
      currency: "EGP",
      integration_id: integrationId || process.env.PAYMOB_INTEGRATION_ID,
    }),
  });
  return res.json();
};

/**
 * Create a Paymob payment session
 * Returns the payment key + iframe URL
 */
export const createPaymobPayment = async (
  amount,
  orderId,
  billingData,
  items = [],
  { integrationId, iframeId, apiKey } = {}
) => {
  // A channel may carry its own merchant credentials; otherwise the shared
  // environment key applies.
  if (!apiKey && !process.env.PAYMOB_API_KEY) {
    throw new Error("Paymob is not configured");
  }

  // Step 1: Auth
  const authToken = await getPaymobAuthToken(apiKey);

  // Step 2: Create order
  const paymobOrder = await createPaymobOrder(authToken, amount, orderId, items);

  // Step 3: Payment key — integrationId selects the gateway (card vs an
  // installment provider like ValU/Souhoola).
  const amountCents = Math.round(amount * 100);
  const paymentKey = await getPaymobPaymentKey(
    authToken,
    paymobOrder.id,
    amountCents,
    billingData,
    integrationId || process.env.PAYMOB_INTEGRATION_ID
  );

  const iframe = iframeId || process.env.PAYMOB_IFRAME_ID;
  const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframe}?payment_token=${paymentKey.token}`;

  return {
    paymentKey: paymentKey.token,
    iframeUrl,
    paymobOrderId: paymobOrder.id,
  };
};

/**
 * Verify Paymob callback HMAC
 */
export const verifyPaymobHmac = (data, hmac) => {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret) return false;

  // Paymob HMAC calculation
  const fields = [
    data.amount_cents,
    data.created_at,
    data.currency,
    data.error_occured,
    data.has_parent_transaction,
    data.id,
    data.integration_id,
    data.is_3d_secure,
    data.is_auth,
    data.is_capture,
    data.is_refunded,
    data.is_standalone_payment,
    data.is_voided,
    data.order,
    data.owner,
    data.pending,
    data.source_data_pan,
    data.source_data_sub_type,
    data.source_data_type,
    data.success,
  ].join("");

  const calculatedHmac = crypto
    .createHmac("sha512", secret)
    .update(fields)
    .digest("hex");

  return calculatedHmac === hmac;
};

/* ─────────────────────────────────────────────────
   TABBY INTEGRATION (Pay-in-4 BNPL, MENA)
   ─────────────────────────────────────────────────
   Tabby's Checkout Session API: we POST the cart, get back a hosted
   web_url, and redirect the customer. Tabby signs webhook callbacks
   with HMAC-SHA256 of the raw body using the merchant secret.
*/

const TABBY_BASE = process.env.TABBY_BASE_URL || "https://api.tabby.ai";

export const createTabbyCheckout = async ({
  amount,
  orderId,
  billingData,
  items = [],
  currency = "EGP",
  successUrl,
  cancelUrl,
  failureUrl,
  lang = "en",
}) => {
  if (!process.env.TABBY_SECRET_KEY || !process.env.TABBY_MERCHANT_CODE) {
    throw new Error("Tabby is not configured (TABBY_SECRET_KEY / TABBY_MERCHANT_CODE missing)");
  }

  const body = {
    payment: {
      amount: Number(amount).toFixed(2),
      currency,
      buyer: {
        phone: billingData.phone,
        email: billingData.email,
        name: `${billingData.firstName || ""} ${billingData.lastName || ""}`.trim() || "Customer",
      },
      order: {
        reference_id: orderId,
        items: items.map((i) => ({
          title: i.name || "Product",
          quantity: i.quantity,
          unit_price: Number(i.price).toFixed(2),
          category: i.category || "general",
        })),
      },
      shipping_address: {
        city: billingData.city || "Cairo",
        address: billingData.street || billingData.address || "—",
        zip: billingData.postalCode || "",
      },
    },
    lang,
    merchant_code: process.env.TABBY_MERCHANT_CODE,
    merchant_urls: {
      success: successUrl,
      cancel: cancelUrl,
      failure: failureUrl,
    },
  };

  const res = await fetch(`${TABBY_BASE}/api/v2/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Tabby error: ${data?.error || data?.message || res.statusText}`);
  }

  // Tabby returns the customer-facing URL nested under
  // configuration.available_products.installments[0].web_url. The session id
  // we store so the webhook can correlate back.
  const webUrl =
    data?.configuration?.available_products?.installments?.[0]?.web_url ||
    data?.web_url;
  if (!webUrl) {
    throw new Error("Tabby returned no checkout URL — the customer may be ineligible");
  }

  return {
    sessionId: data.id,
    paymentUrl: webUrl,
  };
};

export const verifyTabbyWebhook = (rawBody, signatureHeader) => {
  const secret = process.env.TABBY_WEBHOOK_SECRET || process.env.TABBY_SECRET_KEY;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"))
    .digest("hex");
  // Constant-time compare to avoid timing attacks.
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signatureHeader || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/* ─────────────────────────────────────────────────
   TAMARA INTEGRATION (Pay-in-3 BNPL, MENA)
   ─────────────────────────────────────────────────
   Tamara's Checkout API: POST a payload, get back a hosted checkout_url.
   Their webhook authenticates via a static notification_token sent in
   the `tamara-token` header — we compare it to the env value.
*/

const TAMARA_BASE = process.env.TAMARA_BASE_URL || "https://api.tamara.co";

export const createTamaraCheckout = async ({
  amount,
  orderId,
  billingData,
  items = [],
  currency = "EGP",
  successUrl,
  cancelUrl,
  failureUrl,
  notificationUrl,
  lang = "en",
  country = "EG",
  shippingAmount = 0,
  taxAmount = 0,
}) => {
  if (!process.env.TAMARA_API_TOKEN) {
    throw new Error("Tamara is not configured (TAMARA_API_TOKEN missing)");
  }

  const body = {
    order_reference_id: orderId,
    total_amount: { amount: Number(amount).toFixed(2), currency },
    shipping_amount: { amount: Number(shippingAmount).toFixed(2), currency },
    tax_amount: { amount: Number(taxAmount).toFixed(2), currency },
    description: `Belgomla order ${orderId}`,
    country_code: country,
    payment_type: "PAY_BY_INSTALMENTS",
    locale: lang === "ar" ? "ar_EG" : "en_US",
    items: items.map((i, idx) => ({
      reference_id: String(i.id || idx),
      type: "Physical",
      name: i.name || "Product",
      sku: i.sku || String(i.id || idx),
      quantity: i.quantity,
      unit_price: { amount: Number(i.price).toFixed(2), currency },
      total_amount: {
        amount: (Number(i.price) * i.quantity).toFixed(2),
        currency,
      },
    })),
    consumer: {
      email: billingData.email,
      phone_number: billingData.phone,
      first_name: billingData.firstName || "Customer",
      last_name: billingData.lastName || "—",
    },
    shipping_address: {
      first_name: billingData.firstName || "Customer",
      last_name: billingData.lastName || "—",
      line1: billingData.street || billingData.address || "—",
      city: billingData.city || "Cairo",
      country_code: country,
      phone_number: billingData.phone,
    },
    merchant_url: {
      success: successUrl,
      failure: failureUrl,
      cancel: cancelUrl,
      notification: notificationUrl,
    },
  };

  const res = await fetch(`${TAMARA_BASE}/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TAMARA_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Tamara error: ${data?.message || data?.errors?.[0]?.error_code || res.statusText}`);
  }

  return {
    sessionId: data.order_id || data.checkout_id,
    paymentUrl: data.checkout_url,
  };
};

// Tamara authenticates webhooks with a static token in `tamara-token`.
// Compared in constant time, like the Tabby signature above: `===` on a
// shared secret short-circuits at the first differing byte and leaks the
// secret's prefix through response timing.
export const verifyTamaraWebhook = (token) => {
  const expected = process.env.TAMARA_NOTIFICATION_TOKEN;
  if (!expected) return false;
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(token || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/* ─────────────────────────────────────────────────
   PAYMENT GATEWAY ROUTER
   ───────────────────────────────────────────────── */

/**
 * Unified payment creation — automatically picks gateway based on method
 * @param {"stripe"|"paymob"|"cod"} method
 */
export const createPayment = async (method, { amount, orderId, billingData, items, currency }) => {
  switch (method) {
    case "stripe":
      return {
        gateway: "stripe",
        ...(await createStripePaymentIntent(amount, currency, { orderId })),
      };
    case "paymob":
      return {
        gateway: "paymob",
        ...(await createPaymobPayment(
          amount,
          orderId,
          billingData,
          items,
          await resolvePaymobChannel("card")
        )),
      };
    case "paymob_installment":
      return {
        gateway: "paymob_installment",
        ...(await createPaymobPayment(
          amount,
          orderId,
          billingData,
          items,
          await resolvePaymobChannel("installment")
        )),
      };
    case "tabby": {
      const base = (process.env.CLIENT_URL || "https://belgmla.com").replace(/\/$/, "");
      return {
        gateway: "tabby",
        ...(await createTabbyCheckout({
          amount,
          orderId,
          billingData,
          items,
          currency: (currency || "egp").toUpperCase(),
          successUrl: `${base}/order/${orderId}?payment=success`,
          cancelUrl: `${base}/checkout?payment=cancel`,
          failureUrl: `${base}/checkout?payment=failure`,
          lang: billingData?.lang || "en",
        })),
      };
    }
    case "tamara": {
      const base = (process.env.CLIENT_URL || "https://belgmla.com").replace(/\/$/, "");
      const apiBase = (process.env.API_URL || "https://api.belgmla.com").replace(/\/$/, "");
      return {
        gateway: "tamara",
        ...(await createTamaraCheckout({
          amount,
          orderId,
          billingData,
          items,
          currency: (currency || "egp").toUpperCase(),
          successUrl: `${base}/order/${orderId}?payment=success`,
          cancelUrl: `${base}/checkout?payment=cancel`,
          failureUrl: `${base}/checkout?payment=failure`,
          notificationUrl: `${apiBase}/api/payments/webhook/tamara`,
          lang: billingData?.lang || "en",
        })),
      };
    }
    case "cod":
      return { gateway: "cod", status: "pending" };
    default:
      throw new Error(`Unsupported payment method: ${method}`);
  }
};
