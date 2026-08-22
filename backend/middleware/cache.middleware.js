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
    res.set(
      "Cache-Control",
      `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`
    );
    // res.vary appends, so the Origin that CORS adds is kept.
    res.vary(LOCALE_VARY_HEADERS);
    next();
  };
