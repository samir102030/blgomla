/*
  Mirror of backend/config/orderStatuses.js — the two have to agree, or the
  dashboard offers a status the API rejects with a 400 the operator can do
  nothing about.

  In the order they happen. The tracking page steps through this sequence, so
  anything new goes in its true place, not on the end.
*/
export const ORDER_FLOW = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
] as const;

export const ORDER_STATUSES = [...ORDER_FLOW, "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Still on its way — neither delivered nor cancelled. */
export const isOpenStatus = (status?: string): boolean =>
  !!status && status !== "delivered" && status !== "cancelled";

/** The label key each status is translated under. */
export const orderStatusLabelKey = (status: string) =>
  `modal.editOrder.status.${status}`;
