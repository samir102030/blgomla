import Order from "../../models/order.model.js";
import Product from "../../models/product.model.js";
import User from "../../models/user.model.js";
import Store from "../../models/store.model.js";
import { controllerWrapper } from "../../utils/wrappers.js";

// ──────────────────────────────────────────────
//  PAYMENT ANALYTICS
// ──────────────────────────────────────────────

export const getPaymentAnalytics = controllerWrapper(
  "getPaymentAnalytics",
  async (req, res) => {
    const { period = "30days" } = req.query;
    const now = new Date();
    let startDate;

    switch (period) {
      case "7days":
        startDate = new Date(now.getTime() - 7 * 86400000);
        break;
      case "30days":
        startDate = new Date(now.getTime() - 30 * 86400000);
        break;
      case "90days":
        startDate = new Date(now.getTime() - 90 * 86400000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 86400000);
    }

    // Payment method breakdown
    const methodBreakdown = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          total: { $sum: "$totalPrice" },
          paidCount: { $sum: { $cond: ["$isPaid", 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Payment status distribution
    const statusBreakdown = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            isPaid: "$isPaid",
            status: "$status",
          },
          count: { $sum: 1 },
          total: { $sum: "$totalPrice" },
        },
      },
    ]);

    // Daily payment trend
    const paymentTrend = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, isPaid: true } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
          total: { $sum: "$totalPrice" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", total: { $round: ["$total", 2] }, count: 1, _id: 0 } },
    ]);

    // Recent payments (last 20)
    const recentPayments = await Order.find({ isPaid: true })
      .populate("user", "name email")
      .sort({ paidAt: -1 })
      .limit(20)
      .select("totalPrice paymentMethod paidAt status user paymentResult");

    // Summary stats
    const totalPaid = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, isPaid: true } },
      { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
    ]);

    const totalPending = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, isPaid: false, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalPaid: totalPaid[0]?.total || 0,
          paidOrders: totalPaid[0]?.count || 0,
          totalPending: totalPending[0]?.total || 0,
          pendingOrders: totalPending[0]?.count || 0,
        },
        methodBreakdown: methodBreakdown.map((m) => ({
          method: m._id || "unknown",
          count: m.count,
          total: Math.round(m.total * 100) / 100,
          paidCount: m.paidCount,
          successRate: m.count > 0 ? Math.round((m.paidCount / m.count) * 100) : 0,
        })),
        statusBreakdown,
        paymentTrend,
        recentPayments: recentPayments.map((p) => ({
          id: p._id,
          amount: p.totalPrice,
          method: p.paymentMethod,
          paidAt: p.paidAt,
          status: p.status,
          customer: p.user?.name || "Unknown",
          email: p.user?.email || "",
          transactionId: p.paymentResult?.id || null,
        })),
      },
    });
  }
);

// ──────────────────────────────────────────────
//  INVENTORY ALERTS
// ──────────────────────────────────────────────

/*
  The stock field on Product is `stock`. This asked for `quantity`, which the
  schema has never had, and the page was wrong in both directions at once: the
  two `find` queries type-bracket against a missing field so both lists read
  "nothing is out of stock", while the aggregation's `$lte: ["$quantity", 0]`
  did not — a missing field sorts below numbers — so the summary reported
  every product in the shop as out of stock and the catalogue as worth
  nothing. The dashboard's own backlog tile, which uses `stock`, links here
  and disagreed with it.

  `$orderItems.quantity` below is a different field — an order line's
  quantity — and is left alone.
*/
export const getInventoryAlerts = controllerWrapper(
  "getInventoryAlerts",
  async (req, res) => {
    const { lowStockThreshold = 10, outOfStockOnly = false } = req.query;
    const threshold = parseInt(lowStockThreshold);

    // Build base query
    let baseMatch = {
      isActive: true,
      deleted: { $ne: true },
      approvalStatus: "approved",
    };

    // If vendor, filter to their stores
    if (req.user.role === "store") {
      const vendorStores = await Store.find({ owner: req.user._id }).select("_id");
      baseMatch.store = { $in: vendorStores.map((s) => s._id) };
    }

    // Out-of-stock products
    const outOfStock = await Product.find({
      ...baseMatch,
      stock: { $lte: 0 },
    })
      .populate("store", "name")
      .select("name stock images store price sku")
      .sort({ updatedAt: -1 })
      .limit(50);

    // Low-stock products (above 0 but below threshold)
    const lowStock = outOfStockOnly === "true"
      ? []
      : await Product.find({
          ...baseMatch,
          stock: { $gt: 0, $lte: threshold },
        })
          .populate("store", "name")
          .select("name stock images store price sku")
          .sort({ stock: 1 })
          .limit(50);

    // Stock distribution summary
    const stockDistribution = await Product.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          outOfStock: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } },
          lowStock: {
            $sum: {
              $cond: [{ $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", threshold] }] }, 1, 0],
            },
          },
          healthyStock: { $sum: { $cond: [{ $gt: ["$stock", threshold] }, 1, 0] } },
          totalUnits: { $sum: "$stock" },
          totalValue: { $sum: { $multiply: ["$stock", "$price"] } },
        },
      },
    ]);

    // Top selling products that are low on stock (urgent restocking needed)
    const urgentRestock = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 86400000) },
          status: { $ne: "cancelled" },
        },
      },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          unitsSold: { $sum: "$orderItems.quantity" },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $match: {
          "product.stock": { $lte: threshold },
          "product.isActive": true,
          "product.deleted": { $ne: true },
        },
      },
      {
        $project: {
          name: "$product.name",
          currentStock: "$product.stock",
          unitsSold: 1,
          price: "$product.price",
          storeName: "$product.store",
        },
      },
      { $limit: 10 },
    ]);

    const stats = stockDistribution[0] || {
      totalProducts: 0,
      outOfStock: 0,
      lowStock: 0,
      healthyStock: 0,
      totalUnits: 0,
      totalValue: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProducts: stats.totalProducts,
          outOfStock: stats.outOfStock,
          lowStock: stats.lowStock,
          healthyStock: stats.healthyStock,
          totalUnits: stats.totalUnits,
          totalValue: Math.round(stats.totalValue * 100) / 100,
        },
        outOfStockProducts: outOfStock.map((p) => ({
          id: p._id,
          name: p.name,
          quantity: p.stock,
          price: p.price,
          sku: p.sku || null,
          store: p.store?.name || "Unknown",
          image: p.images?.[0]?.url || null,
        })),
        lowStockProducts: lowStock.map((p) => ({
          id: p._id,
          name: p.name,
          quantity: p.stock,
          price: p.price,
          sku: p.sku || null,
          store: p.store?.name || "Unknown",
          image: p.images?.[0]?.url || null,
        })),
        urgentRestock: urgentRestock.map((p) => ({
          id: p._id,
          name: p.name,
          currentStock: p.currentStock,
          unitsSold: p.unitsSold,
          price: p.price,
        })),
      },
    });
  }
);

// ──────────────────────────────────────────────
//  CUSTOMER ANALYTICS
// ──────────────────────────────────────────────

/*
  Roles are customer/store/admin/super_admin. This counted `role: "user"`,
  which nothing in this database has ever been, so every tile on the Customer
  Analytics page read zero and the registration chart came back empty.
*/
export const getCustomerAnalytics = controllerWrapper(
  "getCustomerAnalytics",
  async (req, res) => {
    const { period = "30days" } = req.query;
    const now = new Date();
    let startDate;

    switch (period) {
      case "7days":
        startDate = new Date(now.getTime() - 7 * 86400000);
        break;
      case "30days":
        startDate = new Date(now.getTime() - 30 * 86400000);
        break;
      case "90days":
        startDate = new Date(now.getTime() - 90 * 86400000);
        break;
      case "1year":
        startDate = new Date(now.getTime() - 365 * 86400000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 86400000);
    }

    // Total / new / verified users
    const totalUsers = await User.countDocuments({ role: "user" });
    const newUsers = await User.countDocuments({
      role: "user",
      createdAt: { $gte: startDate },
    });
    const verifiedUsers = await User.countDocuments({
      role: "user",
      isVerified: true,
    });

    // User registration trend
    const registrationTrend = await User.aggregate([
      { $match: { role: "user", createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", count: 1, _id: 0 } },
    ]);

    // Top customers by spending
    const topCustomers = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: "$user",
          totalSpent: { $sum: "$totalPrice" },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: "$totalPrice" },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          name: "$user.name",
          email: "$user.email",
          totalSpent: { $round: ["$totalSpent", 2] },
          orderCount: 1,
          avgOrderValue: { $round: ["$avgOrderValue", 2] },
        },
      },
    ]);

    // Customer retention — users with repeat orders
    const repeatBuyers = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: "cancelled" },
        },
      },
      { $group: { _id: "$user", orderCount: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          totalBuyers: { $sum: 1 },
          repeatBuyers: { $sum: { $cond: [{ $gte: ["$orderCount", 2] }, 1, 0] } },
          oneTimeBuyers: { $sum: { $cond: [{ $eq: ["$orderCount", 1] }, 1, 0] } },
        },
      },
    ]);

    // Order frequency distribution
    const orderFrequency = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: "cancelled" },
        },
      },
      { $group: { _id: "$user", orderCount: { $sum: 1 } } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $eq: ["$orderCount", 1] }, then: "1 order" },
                { case: { $lte: ["$orderCount", 3] }, then: "2-3 orders" },
                { case: { $lte: ["$orderCount", 5] }, then: "4-5 orders" },
              ],
              default: "6+ orders",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { bucket: "$_id", count: 1, _id: 0 } },
    ]);

    const retentionData = repeatBuyers[0] || { totalBuyers: 0, repeatBuyers: 0, oneTimeBuyers: 0 };

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalUsers,
          newUsers,
          verifiedUsers,
          verificationRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
        },
        retention: {
          totalBuyers: retentionData.totalBuyers,
          repeatBuyers: retentionData.repeatBuyers,
          oneTimeBuyers: retentionData.oneTimeBuyers,
          retentionRate:
            retentionData.totalBuyers > 0
              ? Math.round((retentionData.repeatBuyers / retentionData.totalBuyers) * 100)
              : 0,
        },
        registrationTrend,
        topCustomers,
        orderFrequency,
      },
    });
  }
);
