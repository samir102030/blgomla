import type { Notification } from "../types/notification.type";

/**
 * Where a notification takes you.
 *
 * The server sets `link` on anything with somewhere to be — an order, an
 * address — and that is the answer whenever it exists. It is a path, not a
 * URL, because the client router follows it.
 *
 * The guess by type stays underneath for everything created before the field
 * existed. It is only a guess: it can reach the orders tab but not the order,
 * and the notifications that most needed a link were typed "success" rather
 * than "order", so it never fired for them at all.
 *
 * Shared, because the bell and the notifications page were answering this
 * question separately and disagreeing — the page routed by type, the bell did
 * not route at all.
 */
export const routeForNotification = (n: Notification): string | null => {
  if (n.link && n.link.startsWith("/")) return n.link;

  switch (n.type) {
    case "order":
      return "/account?tab=orders";
    case "promotion":
      return "/products";
    default:
      return null;
  }
};
