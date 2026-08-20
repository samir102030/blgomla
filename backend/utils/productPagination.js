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
 * Paginate Product documents with brand/category/store flattened in a single
 * aggregation. Replaces `Product.find().populate(...).populate(...).populate(...)`
 * piped through paginateQuery — that pattern fires 4 round-trips to MongoDB;
 * this one fires 1 via `$facet`.
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

  const [result] = await Product.aggregate([
    { $match: scoped },
    {
      $facet: {
        data: [
          { $sort: sort },
          { $skip: skip },
          { $limit: limit },
          { $project: LIST_PROJECTION },
          ...lookupStages(),
        ],
        meta: [{ $count: "total" }],
      },
    },
  ]);

  const data = result?.data ?? [];
  const total = result?.meta?.[0]?.total ?? 0;
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
