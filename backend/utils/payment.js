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
 * Step 1: Get Paymob authentication token
 */
const getPaymobAuthToken = async () => {
  const res = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY }),
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
  { integrationId, iframeId } = {}
) => {
  if (!process.env.PAYMOB_API_KEY) throw new Error("Paymob is not configured");

  // Step 1: Auth
  const authToken = await getPaymobAuthToken();

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
        ...(await createPaymobPayment(amount, orderId, billingData, items)),
      };
    case "paymob_installment":
      return {
        gateway: "paymob_installment",
        ...(await createPaymobPayment(amount, orderId, billingData, items, {
          integrationId: process.env.PAYMOB_INSTALLMENT_INTEGRATION_ID,
          iframeId:
            process.env.PAYMOB_INSTALLMENT_IFRAME_ID ||
            process.env.PAYMOB_IFRAME_ID,
        })),
      };
    case "cod":
      return { gateway: "cod", status: "pending" };
    default:
      throw new Error(`Unsupported payment method: ${method}`);
  }
};
