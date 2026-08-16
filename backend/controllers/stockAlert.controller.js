import StockAlert from "../models/stockAlert.model.js";
import Product from "../models/product.model.js";
import mongoose from "mongoose";
import { controllerWrapper } from "../utils/wrappers.js";

// Current effective price after an active sale (mirrors frontend getBaseUnitPrice).
export const effectivePrice = (p) => {
  if (p?.saleActive) {
    if (typeof p.salePrice === "number" && p.salePrice > 0) return p.salePrice;
    if (typeof p.salePercentage === "number" && p.salePercentage > 0) {
      return p.price * (1 - p.salePercentage / 100);
    }
  }
  return p?.price ?? 0;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public: subscribe to a back-in-stock or price-drop alert for a product.
export const subscribeStockAlert = controllerWrapper(
  "subscribeStockAlert",
  async (req, res) => {
    const { productId } = req.params;
    const { email, type = "restock" } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, message: "A valid email is required" });
    }
    if (!["restock", "price_drop"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid alert type" });
    }

    const product = await Product.findById(productId).select(
      "price salePrice saleActive salePercentage"
    );
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const update = {
      product: productId,
      email: normalizedEmail,
      type,
      notified: false,
      ...(req.user?._id ? { user: req.user._id } : {}),
      ...(type === "price_drop"
        ? { priceAtSubscribe: effectivePrice(product) }
        : {}),
    };

    // Upsert so re-subscribing resets the baseline and the notified flag.
    await StockAlert.findOneAndUpdate(
      { product: productId, email: normalizedEmail, type },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      message: "We'll email you when it's available.",
    });
  }
);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Admin: the demand log. Every subscription above lands here, so the shop can
// see which out-of-stock products people are actually asking for — and the
// email of each person waiting, alongside the product they want.
export const listStockAlerts = controllerWrapper(
  "listStockAlerts",
  async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const { type, status, q } = req.query;

    const match = {};
    if (type === "restock" || type === "price_drop") match.type = type;
    if (status === "pending") match.notified = false;
    if (status === "notified") match.notified = true;

    // Search spans both columns of the table: the product asked for and the
    // person asking. It runs after the lookup so a product name is matchable.
    const search = q?.trim()
      ? [
          {
            $match: {
              $or: [
                { email: { $regex: escapeRegex(q.trim()), $options: "i" } },
                { "product.name": { $regex: escapeRegex(q.trim()), $options: "i" } },
              ],
            },
          },
        ]
      : [];

    const withProduct = [
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      // A product deleted since the request still leaves the email worth seeing.
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    ];

    const projectRow = {
      $project: {
        _id: 0,
        id: "$_id",
        email: 1,
        type: 1,
        notified: 1,
        createdAt: 1,
        priceAtSubscribe: 1,
        product: {
          id: "$product._id",
          name: "$product.name",
          price: "$product.price",
          stock: "$product.stock",
          image: { $ifNull: [{ $first: "$product.images.url" }, null] },
        },
      },
    };

    const [paged, totalAll, pendingRestock, notifiedCount, waitedFor, topProducts] =
      await Promise.all([
        StockAlert.aggregate([
          { $match: match },
          ...withProduct,
          ...search,
          { $sort: { createdAt: -1 } },
          {
            $facet: {
              rows: [{ $skip: (page - 1) * limit }, { $limit: limit }, projectRow],
              count: [{ $count: "n" }],
            },
          },
        ]),
        StockAlert.countDocuments({}),
        StockAlert.countDocuments({ type: "restock", notified: false }),
        StockAlert.countDocuments({ notified: true }),
        StockAlert.distinct("product", { type: "restock", notified: false }),
        // Ranked by how many people are waiting — what to restock first.
        StockAlert.aggregate([
          { $match: { type: "restock", notified: false } },
          {
            $group: {
              _id: "$product",
              requests: { $sum: 1 },
              lastRequest: { $max: "$createdAt" },
            },
          },
          { $sort: { requests: -1, lastRequest: -1 } },
          { $limit: 5 },
          // Not `withProduct`: after the $group the product id is `_id`, so the
          // lookup has to join on that instead.
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "product",
            },
          },
          { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              id: "$_id",
              requests: 1,
              lastRequest: 1,
              name: "$product.name",
              stock: "$product.stock",
              image: { $ifNull: [{ $first: "$product.images.url" }, null] },
            },
          },
        ]),
      ]);

    const rows = paged[0]?.rows ?? [];
    const total = paged[0]?.count?.[0]?.n ?? 0;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total: totalAll,
          pendingRestock,
          notified: notifiedCount,
          productsWaitedFor: waitedFor.length,
        },
        topProducts,
        requests: rows,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
        total,
      },
    });
  }
);
