import { clearCache } from "../middleware/cache.js";

/**
 * Drop every cached view that a change to the catalogue's shape can affect.
 *
 * The home feed is assembled from categories, brands and collections and
 * cached under its own namespace. Clearing only the namespace you just wrote
 * to leaves the front page serving the previous answer for up to its TTL —
 * which is exactly what "I added it, the dashboard shows it, the site doesn't"
 * looks like from the outside.
 *
 * Cheap to over-invalidate here: these caches refill on the next request.
 */
export const clearStorefrontCaches = (...namespaces) => {
  for (const ns of namespaces) clearCache(ns);
  clearCache("home-feed");
};

/**
 * Express middleware form, for route tables.
 *
 * Clears once the response has gone out, not on the way in. Clearing first put
 * the emptied cache and the write it was meant to reflect in the wrong order:
 * any read landing between the two — the storefront, a second tab, the browser
 * revalidating — missed, went to the database, found the row as it was *before*
 * the write, and cached that answer for the full five-minute TTL. The edit was
 * saved and invisible, which reads from the outside as "it didn't take".
 *
 * Only successful responses clear. A rejected write changed nothing, so there
 * is nothing to invalidate.
 */
export const invalidateStorefront = (...namespaces) => (req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode >= 200 && res.statusCode < 400) {
      clearStorefrontCaches(...namespaces);
    }
  });
  next();
};
