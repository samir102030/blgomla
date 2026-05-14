/**
 * Tiny per-route response cache + Cache-Control header helper.
 *
 * In-memory LRU keyed by `req.originalUrl` (path + query). Strictly for
 * unauthenticated GETs to stable read endpoints (brands, categories).
 * Skips automatically when a logged-in user hits the route — we don't want
 * to leak personalised responses across users.
 *
 * No external dep — Node's built-in Map ordering gives us O(1) LRU eviction
 * by deleting + re-inserting on hit.
 */
const stores = new Map(); // namespace -> { ttl, max, entries: Map<key, {body, headers, expiresAt}> }

function getStore(namespace, ttlMs, max) {
  let s = stores.get(namespace);
  if (!s) {
    s = { ttl: ttlMs, max, entries: new Map() };
    stores.set(namespace, s);
  }
  return s;
}

export function clearCache(namespace) {
  const s = stores.get(namespace);
  if (s) s.entries.clear();
}

/**
 * Express middleware that caches the JSON body of a GET response.
 * Usage: `router.get("/brands", cache({ namespace: "brands", ttl: 60_000 }), handler)`
 */
export const cache = ({ namespace, ttl = 60_000, max = 200, cacheControl } = {}) => {
  if (!namespace) throw new Error("cache() needs a namespace");
  const store = getStore(namespace, ttl, max);

  return (req, res, next) => {
    if (req.method !== "GET") return next();
    // Don't cache personalised responses — a logged-in request might include
    // user-specific fields (e.g. wishlist counts) in the future.
    if (req.user) return next();

    const key = req.originalUrl;
    const now = Date.now();
    const hit = store.entries.get(key);

    if (hit && hit.expiresAt > now) {
      // LRU touch: move to end.
      store.entries.delete(key);
      store.entries.set(key, hit);
      if (cacheControl) res.set("Cache-Control", cacheControl);
      res.set("X-Cache", "HIT");
      return res.status(200).json(hit.body);
    }

    // Intercept res.json to capture the payload.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) {
        store.entries.set(key, { body, expiresAt: now + ttl });
        // Evict oldest if over capacity.
        if (store.entries.size > max) {
          const firstKey = store.entries.keys().next().value;
          store.entries.delete(firstKey);
        }
      }
      if (cacheControl) res.set("Cache-Control", cacheControl);
      res.set("X-Cache", "MISS");
      return originalJson(body);
    };

    next();
  };
};
