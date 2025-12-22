import type { Order } from "./order.type";

export type ReturnStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "received"
  | "refunded";

export interface ReturnRequest {
  _id: string;
  order: string | Order | { _id: string; status?: string; totalPrice?: number; createdAt?: string };
  user?: string | { _id?: string; name?: string; email?: string };
  store?: string | { _id?: string; name?: string };
  status: ReturnStatus;
  reason?: string;
  adminNote?: string;
  createdAt?: string;
  updatedAt?: string;
}
