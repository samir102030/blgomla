import { LOCALE_VARY_HEADERS } from "./translation.middleware.js";

// `maxAge` (browser cache, in seconds) + `sMaxAge` (CDN) + `swr`
// (stale-while-revalidate). Setting `maxAge` lets the browser itself serve
// repeat navigations without hitting the network at all.
//
// Vary is not optional here. Every route wearing these headers answers in the
// language the request asked for, and the CDN in front of them keys on the URL
// alone: for sixty seconds, whichever language asked first was the language
// everyone got. That is what put Arabic department names under an English
// interface — intermittently, for a minute at a time, with nothing in the app
// to explain it. The three headers are the ones translation.middleware reads.
export const cacheHeaders = (sMaxAge = 60, swr = 300, maxAge = sMaxAge) =>
  (req, res, next) => {
    /*
      A request carrying a session is never answered from a shared cache.

      app.js already decides this for the same set of paths — "Skip cache for
      authenticated requests (they may see admin/vendor data)" — and then
      every route that also wears these headers overrides it, because this
      middleware runs later inside the router and `res.set` replaces rather
      than merges. So the rule held for exactly the routes that had no
      route-level caching and was quietly void on the ones that did: products,
      categories, brands, collections.

      Nothing on those routes varies by caller today — `optionalAuth` is
      applied to one unrelated route, so `req.user` is undefined on all of
      them, which is why this has not leaked. That is a property of today's
      middleware order, not a guarantee: these handlers all contain branches
      of the form `if (req.user)`, and the day one of them starts receiving a
      user, an admin's answer would be stored at the edge under a plain URL
      and handed to the next anonymous visitor for a minute.

      Checking the cookie rather than `req.user` is deliberate — it is what
      the CDN itself can see, and it does not depend on which auth middleware
      happens to have run first.
    */
    if (req.headers.cookie?.includes("accessToken")) {
      // `private` rather than `no-store`: it is the directive that forbids a
      // shared cache from keeping the response, which is the whole hazard,
      // and it leaves the signed-in shopper's own browser caching exactly as
      // it does today. `no-store` would close the same hole and make every
      // back-navigation on the storefront refetch the listing — a cost paid
      // by this shop's customers for no additional safety.
      res.set("Cache-Control", `private, max-age=${maxAge}`);
      res.vary(LOCALE_VARY_HEADERS);
      return next();
    }

    res.set(
      "Cache-Control",
      `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`
    );
    // res.vary appends, so the Origin that CORS adds is kept.
    res.vary(LOCALE_VARY_HEADERS);
    next();
  };
