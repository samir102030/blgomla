import Product from "../models/product.model.js";
import { HIDE_ELECTRONICS } from "./electronicsVisibility.js";

const DEFAULT_PAGE = 1;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;

/*
  Fields excluded from list responses — heavy arrays we never render on cards.

  `bulkPricing` is deliberately NOT among them any more. It is at most ten
  tiers of two numbers, far smaller than the `images` array that stays, and
  dropping it had a cost nobody had counted: the dashboard's edit modal is
  handed a row straight from this list, saw no tiers, and submitted an empty
  array — which the update endpoint wrote. Editing a wholesale product's name
  deleted its quantity breaks.

  The modal now also refuses to send the field when it did not receive one, so
  the two guards are independent: this keeps the tiers visible and editable,
  and that one keeps them safe if the projection ever changes again.
*/
const LIST_PROJECTION = {
  reviews: 0,
  reviewRequests: 0,
  suggestedPrices: 0,
  competitorPrices: 0,
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
  // Capped for the same reason as utils/pagination.js — see the note there.
  limit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
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

    The fix is only to stop wrapping it. $match followed immediately by $sort
    is the one shape whose sort an index can serve, and the sort keys are all
    indexed already — createdAt, price, soldCount, rating, name. An index-backed
    sort holds nothing at all: the documents come out in order, and $skip walks
    past them without building anything. There is no ceiling left to hit.

    Which is also why the stage order below matters, and why the first attempt
    at this only half-worked. Moving $project ahead of $sort makes the documents
    smaller, which sounds like the obvious thing to do — but a $sort that is not
    directly after $match cannot use an index, so it traded a cheap index scan
    for a smaller blocking sort. The ceiling moved from ~4,660 to ~5,000 rather
    than going away. The projection belongs after $limit, where it costs one
    page of documents instead of all of them.

    The count is its own query now that $facet is gone, running alongside under
    Promise.all, so the round trip costs what it did before.
  */
  const [data, total] = await Promise.all([
    Product.aggregate([
      { $match: scoped },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
      { $project: LIST_PROJECTION },
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
