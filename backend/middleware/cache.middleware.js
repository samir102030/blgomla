export const cacheHeaders = (sMaxAge = 60, swr = 300) => (req, res, next) => {
  res.set("Cache-Control", `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`);
  next();
};
