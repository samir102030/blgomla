import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Collection from "../models/collection.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

// Single aggregation that pulls `brand`/`category`/`store` inline. Replaces
// three sequential `.populate()` calls — saves ~2 round-trips per section.
const LIST_PROJECTION = {
  reviews: 0,
  reviewRequests: 0,
  suggestedPrices: 0,
  competitorPrices: 0,
  bulkPricing: 0,
};

const productListPipeline = (filter, sort, limit) => [
  { $match: filter },
  { $sort: sort },
  { $limit: limit },
  { $project: LIST_PROJECTION },
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
      pipeline: [{ $project: { storeName: 1, logo: 1 } }],
      as: "store",
    },
  },
  { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
];

const queries = {
  products: () =>
    Product.aggregate(
      productListPipeline(
        { isActive: true, deleted: false, approvalStatus: "approved" },
        { createdAt: -1 },
        12
      )
    ),

  saleProducts: () =>
    Product.aggregate(
      productListPipeline(
        { saleActive: true, isActive: true, deleted: false },
        { createdAt: -1 },
        20
      )
    ),

  newestProducts: () =>
    Product.aggregate(
      productListPipeline(
        { isActive: true, deleted: false },
        { createdAt: -1 },
        10
      )
    ),

  bestSellers: () =>
    Product.aggregate(
      productListPipeline(
        { isActive: true, deleted: false },
        { soldCount: -1 },
        12
      )
    ),

  topRated: () =>
    Product.aggregate(
      productListPipeline(
        { isActive: true, deleted: false },
        { rating: -1 },
        12
      )
    ),

  categories: async () => {
    // Categories + per-category counts in one round-trip via $lookup.
    const cats = await Category.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $sort: { sortOrder: 1, name: 1 } },
      {
        $lookup: {
          from: "categories",
          localField: "parentCategory",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, slug: 1 } }],
          as: "parentCategory",
        },
      },
      { $unwind: { path: "$parentCategory", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "subCategories",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, slug: 1 } }],
          as: "subCategories",
        },
      },
      {
        $lookup: {
          from: "products",
          let: { catId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$category", "$$catId"] }, deleted: { $ne: true } } },
            { $count: "n" },
          ],
          as: "_counts",
        },
      },
      {
        $addFields: {
          productCount: { $ifNull: [{ $arrayElemAt: ["$_counts.n", 0] }, 0] },
        },
      },
      { $project: { _counts: 0 } },
    ]);
    return cats;
  },

  collections: () =>
    Collection.find({ isActive: true })
      .populate("items.product")
      .sort({ createdAt: -1 })
      .lean(),
};

export const getHomeFeed = controllerWrapper("getHomeFeed", async (req, res) => {
  const keys = Object.keys(queries);
  const settled = await Promise.allSettled(keys.map((k) => queries[k]()));

  const data = {};
  const errors = {};
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") {
      data[keys[i]] = r.value;
    } else {
      data[keys[i]] = [];
      errors[keys[i]] = r.reason?.message || "failed";
    }
  });

  res.status(200).json({
    success: true,
    data,
    ...(Object.keys(errors).length ? { partial: errors } : {}),
  });
});
