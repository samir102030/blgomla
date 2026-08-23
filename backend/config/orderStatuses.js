/**
 * The one list of states an order can be in.
 *
 * There were four, and they disagreed. The model allows seven; the controller
 * writes a customer notification for six; the customer's own tracking page
 * draws a six-step progress bar; the request validator accepted five. The two
 * the validator left out — `confirmed` and `out_for_delivery` — are steps two
 * and five of that progress bar, so no order could ever reach them: the bar
 * skipped from "Order Placed" to "Processing" and from "Shipped" to
 * "Delivered", permanently, for every customer.
 *
 * They were not oversights elsewhere. Both are translated into Arabic and
 * English in three separate places already — the tracking page, the vendor
 * dashboard's badges, and the support bot's replies — and `auth.controller`
 * counts a customer's open orders as pending + confirmed + processing. The
 * shop was built for seven. Only the validator and the admin's dropdown
 * stopped at five, and between them they decided what actually happens.
 *
 * A list in four places is a list that drifts. They all import this one now.
 */

/**
 * In the order they happen. The sequence is the point: the tracking page steps
 * through this list, so anything added here has to go in its true place, not
 * on the end.
 */
export const ORDER_FLOW = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

/** Every state an order may hold, including the one that ends it. */
export const ORDER_STATUSES = [...ORDER_FLOW, "cancelled"];

/**
 * What the timeline may record, which is more than the order may *be*.
 *
 * `paid` and `refunded` are moments in an order's history — markOrderPaid
 * writes one — but they are not states the order rests in, so they belong to
 * the timeline's enum and not to the order's.
 */
export const TIMELINE_STATUSES = [
  "pending",
  "paid",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "refunded",
];

/** Orders still on their way — not delivered, not cancelled. */
export const OPEN_STATUSES = ORDER_FLOW.filter((s) => s !== "delivered");

export const isOrderStatus = (value) => ORDER_STATUSES.includes(String(value || "").trim());

/**
 * Whether a status means the parcel is with the customer.
 *
 * `isDelivered` and `deliveredAt` are a second copy of this fact, and the two
 * copies have to be written together or they drift — which is what
 * `settleDelivery` in the order controller exists to prevent.
 */
export const isDeliveredStatus = (value) => String(value || "").trim() === "delivered";
