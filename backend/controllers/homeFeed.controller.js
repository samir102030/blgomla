import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Collection from "../models/collection.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

const populateProduct = (q) =>
  q
    .populate("brand", "name slug logo")
    .populate("category", "name slug")
    .populate("store", "storeName logo");

const queries = {
  products: () =>
    populateProduct(
      Product.find({
        isActive: true,
        deleted: false,
        approvalStatus: "approved",
      })
        .sort({ createdAt: -1 })
        .limit(12)
    ).lean(),

  saleProducts: () =>
    populateProduct(
      Product.find({
        saleActive: true,
        isActive: true,
        deleted: false,
      }).limit(20)
    ).lean(),

  newestProducts: () =>
    populateProduct(
      Product.find({
        isActive: true,
        deleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(10)
    ).lean(),

  categories: async () => {
    const cats = await Category.find({ deleted: { $ne: true } })
      .populate("parentCategory", "name slug")
      .populate("subCategories", "name slug")
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    const counts = await Product.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id?.toString(), c.count]));
    return cats.map((c) => ({
      ...c,
      productCount: countMap.get(c._id.toString()) || 0,
    }));
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
