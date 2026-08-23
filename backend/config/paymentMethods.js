/**
 * The one list of payment methods this shop takes.
 *
 * There were three, and they disagreed. The checkout page offered five methods,
 * the order controller's own array accepted four, and the request validator in
 * front of it accepted exactly one — `paymentMethod === "cod"` — so every
 * customer who picked a card, an instalment plan, Tabby or Tamara was turned
 * away with a 400 before the controller ran at all. The validator's reply
 * carried no `message`, so the checkout page printed its generic "Invalid order
 * data provided" and the customer was told nothing about what to change.
 *
 * A list in three places is a list that will drift again. Both ends now import
 * this one.
 *
 * ## Offered is not the same as ready
 *
 * `PAYMENT_METHODS` is what the code supports and will accept. `isConfigured`
 * is whether this server currently holds the credentials to complete it, and
 * the two are deliberately separate: the merchant accounts are being opened
 * while the shop is being built, so a method has to be able to sit on the page
 * before its keys exist without the order route rejecting it out of hand. What
 * must not happen is a customer reaching the end of checkout and finding out
 * with a blank error, which is why the gateway step reports the missing
 * configuration by name.
 */

/** Every method the code knows how to take. `cod` needs nothing to work. */
export const PAYMENT_METHODS = [
  "cod",
  "stripe",
  "paymob",
  "paymob_installment",
  "tabby",
  "tamara",
];

/** The ones that hand the customer to somebody else's payment page. */
export const ONLINE_METHODS = PAYMENT_METHODS.filter((m) => m !== "cod");

/** What each gateway needs before it can do anything. */
const REQUIRES = {
  cod: [],
  stripe: ["STRIPE_SECRET_KEY"],
  paymob: ["PAYMOB_API_KEY", "PAYMOB_INTEGRATION_ID", "PAYMOB_IFRAME_ID"],
  // The instalment flow falls back to the ordinary iframe when no separate one
  // is set, so it needs what Paymob needs and nothing more.
  paymob_installment: ["PAYMOB_API_KEY", "PAYMOB_INTEGRATION_ID", "PAYMOB_IFRAME_ID"],
  tabby: ["TABBY_SECRET_KEY", "TABBY_MERCHANT_CODE"],
  tamara: ["TAMARA_API_TOKEN"],
};

export const normaliseMethod = (value) => String(value || "").trim().toLowerCase();

export const isPaymentMethod = (value) => PAYMENT_METHODS.includes(normaliseMethod(value));

/** The settings this method needs that this server does not have. */
export const missingConfigFor = (value) =>
  (REQUIRES[normaliseMethod(value)] || []).filter((name) => !process.env[name]);

export const isConfigured = (value) => missingConfigFor(value).length === 0;

/** What the storefront may offer today, and which of those can be completed. */
export const paymentMethodStatus = () =>
  PAYMENT_METHODS.map((method) => ({
    method,
    configured: isConfigured(method),
    missing: missingConfigFor(method),
  }));
