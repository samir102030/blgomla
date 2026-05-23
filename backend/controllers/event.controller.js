import Event from "../models/event.model.js";
import mongoose from "mongoose";
import { controllerWrapper } from "../utils/wrappers.js";

const VALID_TYPES = [
  "view",
  "add_to_cart",
  "search",
  "search_no_results",
  "checkout_start",
];

// Fire-and-forget logger for server-side call sites (e.g. zero-result search).
// Never throws — analytics must not break the request it's observing.
export const logEventSafe = (data) => {
  Event.create(data).catch(() => {});
};

// Public capture endpoint — anonymous-friendly, responds fast.
export const createEvent = controllerWrapper("createEvent", async (req, res) => {
  const { type, product, query, sessionId, meta } = req.body || {};
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ success: false, message: "Invalid event type" });
  }
  const doc = { type };
  if (product && mongoose.Types.ObjectId.isValid(product)) doc.product = product;
  if (typeof query === "string") doc.query = query.slice(0, 200);
  if (typeof sessionId === "string") doc.sessionId = sessionId.slice(0, 100);
  if (meta && typeof meta === "object") doc.meta = meta;
  if (req.user?._id) doc.user = req.user._id;

  logEventSafe(doc);
  res.status(202).json({ success: true });
});

// Admin insights — what shoppers search for, miss, and view.
export const getInsights = controllerWrapper("getInsights", async (req, res) => {
  const days = Math.min(Number(req.query.days) || 30, 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const groupByQuery = (type) => [
    { $match: { type, createdAt: { $gte: since }, query: { $nin: [null, ""] } } },
    { $group: { _id: { $toLower: "$query" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
    { $project: { _id: 0, query: "$_id", count: 1 } },
  ];

  const [noResults, topSearches, topViewedRaw, addToCart] = await Promise.all([
    Event.aggregate(groupByQuery("search_no_results")),
    Event.aggregate(groupByQuery("search")),
    Event.aggregate([
      { $match: { type: "view", createdAt: { $gte: since }, product: { $ne: null } } },
      { $group: { _id: "$product", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1 } }],
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, productId: "$_id", name: "$product.name", count: 1 } },
    ]),
    Event.aggregate([
      { $match: { type: "add_to_cart", createdAt: { $gte: since } } },
      { $count: "total" },
    ]),
  ]);

  res.status(200).json({
    success: true,
    days,
    insights: {
      noResultSearches: noResults,
      topSearches,
      topViewed: topViewedRaw,
      addToCartCount: addToCart?.[0]?.total || 0,
    },
  });
});
