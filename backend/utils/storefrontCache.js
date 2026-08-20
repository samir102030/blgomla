import { clearCache } from "../middleware/cache.js";
import { forgetElectronicsVisibility } from "./electronicsVisibility.js";

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
  // Publishing the electronics section is a category edit like any other,
  // and the operator expects the shop to show it on the next page load.
  forgetElectronicsVisibility();
};

/** Express middleware form, for route tables. */
export const invalidateStorefront = (...namespaces) => (req, res, next) => {
  clearStorefrontCaches(...namespaces);
  next();
};
