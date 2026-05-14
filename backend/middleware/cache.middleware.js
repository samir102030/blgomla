// `maxAge` (browser cache, in seconds) + `sMaxAge` (CDN) + `swr`
// (stale-while-revalidate). Setting `maxAge` lets the browser itself serve
// repeat navigations without hitting the network at all.
export const cacheHeaders = (sMaxAge = 60, swr = 300, maxAge = sMaxAge) =>
  (req, res, next) => {
    res.set(
      "Cache-Control",
      `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`
    );
    next();
  };
