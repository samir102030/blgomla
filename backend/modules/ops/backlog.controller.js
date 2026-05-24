import Order from "../../models/order.model.js";
import Return from "../../models/return.model.js";
import Product from "../../models/product.model.js";
import ProductQuestion from "../../models/productQuestion.model.js";
import BrandRequest from "../../models/brandRequest.model.js";
import CategoryRequest from "../../models/categoryRequest.model.js";
import Store from "../../models/store.model.js";
import Event from "../../models/event.model.js";
import { controllerWrapper } from "../../utils/wrappers.js";

const DAY = 24 * 60 * 60 * 1000;

// Operations backlog — everything across the platform that's waiting on staff
// action, in one call. Resilient: a failing/absent model yields 0, never 500.
export const getBacklog = controllerWrapper("getBacklog", async (req, res) => {
  const twoDaysAgo = new Date(Date.now() - 2 * DAY);
  const sevenDaysAgo = new Date(Date.now() - 7 * DAY);

  const settled = await Promise.allSettled([
    Order.countDocuments({
      status: { $in: ["pending", "processing"] },
      deleted: { $ne: true },
    }),
    Order.countDocuments({
      status: { $in: ["pending", "processing"] },
      deleted: { $ne: true },
      createdAt: { $lte: twoDaysAgo },
    }),
    Return.countDocuments({ status: "pending" }),
    Product.countDocuments({ approvalStatus: "pending", deleted: { $ne: true } }),
    Product.countDocuments({
      deleted: { $ne: true },
      isActive: true,
      stock: { $lte: 5, $gt: 0 },
    }),
    Product.countDocuments({
      deleted: { $ne: true },
      isActive: true,
      stock: { $lte: 0 },
    }),
    ProductQuestion.countDocuments({ "answers.0": { $exists: false } }),
    BrandRequest.countDocuments({ status: "pending" }),
    CategoryRequest.countDocuments({ status: "pending" }),
    Store.countDocuments({ status: "pending", deleted: { $ne: true } }),
    Event.countDocuments({
      type: "search_no_results",
      createdAt: { $gte: sevenDaysAgo },
    }),
  ]);

  const v = (i) => (settled[i].status === "fulfilled" ? settled[i].value : 0);

  res.status(200).json({
    success: true,
    backlog: {
      ordersToFulfill: v(0),
      ordersAging: v(1),
      returnsPending: v(2),
      productApprovals: v(3),
      lowStock: v(4),
      outOfStock: v(5),
      unansweredQuestions: v(6),
      brandRequests: v(7),
      categoryRequests: v(8),
      vendorApprovals: v(9),
      noResultSearches7d: v(10),
    },
  });
});
