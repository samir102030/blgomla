import Product from "../models/product.model.js";
import { HIDE_ELECTRONICS } from "./electronicsVisibility.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

// Fields excluded from list responses — heavy arrays we never render on cards.
const LIST_PROJECTION = {
  reviews: 0,
  reviewRequests: 0,
  suggestedPrices: 0,
  competitorPrices: 0,
  bulkPricing: 0,
};

// Build $lookup stages that flatten brand/category/store into the same shape
// `.populate()` would produce, but in a single round trip via aggregation.
const lookupStages = (extra = []) => [
  {
    $lookup: {
      from: "brands",
      localField: "brand",
      foreignField: "_id",
      pipeline: [{ $project: { name: 1, slug: 1, logo: 1 } }],
      as: "brand",
    },
  },
  { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "categories",
      localField: "category",
      foreignField: "_id",
      pipeline: [{ $project: { name: 1, slug: 1 } }],
      as: "category",
    },
  },
  { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "stores",
      localField: "store",
      foreignField: "_id",
      // The field on Store is `name`; projecting only `storeName` asked for
      // something that has never existed, so every list response carried a
      // store object of just `_id` and any UI showing a seller name rendered
      // blank. Both are listed because some callers read `storeName`.
      pipeline: [{ $project: { name: 1, storeName: 1, logo: 1 } }],
      as: "store",
    },
  },
  { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
  ...extra,
];

/**
 * Paginate Product documents with brand/category/store flattened by the
 * database rather than by three follow-up queries. Replaces
 * `Product.find().populate(...).populate(...).populate(...)` piped through
 * paginateQuery, which fires four round trips; this fires two, concurrently.
 */
export async function paginateProducts({
  filter = {},
  sort = { createdAt: -1 },
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
} = {}) {
  page = Math.max(Number(page) || DEFAULT_PAGE, 1);
  limit = Math.max(Number(limit) || DEFAULT_LIMIT, 1);
  const skip = (page - 1) * limit;

  // The schema hook cannot reach an aggregation, and this function is behind
  // most of the storefront's listings, so it asks the same question here.
  const scoped =
    filter.audience === undefined ? { ...filter, ...HIDE_ELECTRONICS } : filter;

  /*
    Two queries at once, rather than one $facet.

    $facet holds each of its sub-pipelines in a 100 MB buffer and cannot spill
    to disk whatever you allow — so the `$sort` inside it had to keep every
    document it might return in memory at once. A sort followed by skip+limit
    keeps skip+limit documents, which grows with the page number, and at around
    4,660 documents it ran out and the endpoint answered 500.

    Measured against the live catalogue: skip+limit ≤ 4,650 returned 200 and
    ≥ 4,680 returned 500, on every combination tried — limit=1 page=4700 failed
    while limit=200 page=23 succeeded. It was never the page number and never a
    particular product; it was how many documents the sort was made to hold.
    Roughly the last 1,500 products of 6,141 could not be reached at all, by
    anything: the storefront's deeper pages, the admin list, an export, a
    crawler.

    Three changes, each doing part of the work:

      · No $facet, so no 100 MB ceiling. The count runs as its own query
        alongside — Promise.all, so the round trip costs what it did before.
      · $project before $sort rather than after. The sort was holding whole
        product documents, reviews and competitor prices and all, to order them
        by a single scalar; now it holds what the list actually returns.
      · allowDiskUse, which outside a $facet is honoured, so a sort too big for
        memory becomes slow rather than fatal.

    An index on the sort key would remove the sort's memory cost entirely, and
    is the right next step for `createdAt`, `price`, `soldCount` and `rating`.
    This does not need one to be correct.
  */
  const [data, total] = await Promise.all([
    Product.aggregate([
      { $match: scoped },
      { $project: LIST_PROJECTION },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
      ...lookupStages(),
    ]).allowDiskUse(true),
    Product.countDocuments(scoped),
  ]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return {
    success: true,
    data,
    total,
    limit,
    page: Math.min(page, pages),
    pages,
  };
}
