import Order from "../../models/order.model.js";
import Product from "../../models/product.model.js";
import Store from "../../models/store.model.js";
import { controllerWrapper } from "../../utils/wrappers.js";

export const getSalesOverview = controllerWrapper(
  "getSalesOverview",
  async (req, res) => {
    const { period = "7days" } = req.query;

    // Define date ranges based on period
    const now = new Date();
    let startDate, prevStartDate, prevEndDate;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        prevStartDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1
        );
        prevEndDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
          23,
          59,
          59
        );
        break;
      case "yesterday":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1
        );
        prevStartDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 2
        );
        prevEndDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 2,
          23,
          59,
          59
        );
        break;
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        prevEndDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        prevStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        prevEndDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        prevEndDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Build query based on user role
    let matchQuery = { createdAt: { $gte: startDate } };
    let prevMatchQuery = {
      createdAt: { $gte: prevStartDate, $lt: prevEndDate },
    };

    if (req.user.role === "store") {
      const vendorStores = await Store.find({ owner: req.user._id }).select(
        "_id"
      );
      const storeIds = vendorStores.map((store) => store._id);

      if (storeIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            current: 0,
            previous: 0,
            change: 0,
            changePercent: 0,
          },
        });
      }

      const productIds = await Product.find({
        store: { $in: storeIds },
      }).distinct("_id");
      matchQuery.$or = [
        { store: { $in: storeIds } },
        { "orderItems.product": { $in: productIds } },
      ];
      prevMatchQuery.$or = matchQuery.$or;
    }
    // Admin gets all orders

    // Aggregate current period sales
    const currentSales = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ]);

    // Aggregate previous period sales
    const previousSales = await Order.aggregate([
      { $match: prevMatchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ]);

    const current = currentSales[0]?.total || 0;
    const previous = previousSales[0]?.total || 0;
    const change = current - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        current: Math.round(current * 100) / 100,
        previous: Math.round(previous * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
      },
    });
  }
);

export const getTopProducts = controllerWrapper(
  "getTopProducts",
  async (req, res) => {
    const { limit = 5 } = req.query;

    // Build match query based on role
    let matchQuery = {};

    if (req.user.role === "store") {
      const vendorStores = await Store.find({ owner: req.user._id }).select(
        "_id"
      );
      const storeIds = vendorStores.map((store) => store._id);

      if (storeIds.length === 0) {
        return res.status(200).json({ success: true, products: [] });
      }

      const productIds = await Product.find({
        store: { $in: storeIds },
      }).distinct("_id");
      matchQuery = {
        $or: [
          { store: { $in: storeIds } },
          { "orderItems.product": { $in: productIds } },
        ],
      };
    }

    const topProducts = await Order.aggregate([
      { $match: matchQuery },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          totalSales: {
            $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] },
          },
          totalUnits: { $sum: "$orderItems.quantity" },
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: parseInt(limit) },
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
        $project: {
          name: "$product.name",
          sales: { $round: ["$totalSales", 2] },
          units: "$totalUnits",
        },
      },
    ]);

    res.status(200).json({ success: true, products: topProducts });
  }
);

export const getRecentTransactions = controllerWrapper(
  "getRecentTransactions",
  async (req, res) => {
    const { limit = 5 } = req.query;

    // Build query based on role
    let query = {};

    if (req.user.role === "store") {
      const vendorStores = await Store.find({ owner: req.user._id }).select(
        "_id"
      );
      const storeIds = vendorStores.map((store) => store._id);

      if (storeIds.length === 0) {
        return res.status(200).json({ success: true, transactions: [] });
      }

      const productIds = await Product.find({
        store: { $in: storeIds },
      }).distinct("_id");
      query = {
        $or: [
          { store: { $in: storeIds } },
          { "orderItems.product": { $in: productIds } },
        ],
      };
    }

    const transactions = await Order.find(query)
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select("id totalPrice status createdAt user");

    const formattedTransactions = transactions.map((order) => ({
      id: order._id,
      customer: order.user?.name || "Unknown",
      amount: `$${order.totalPrice.toFixed(2)}`,
      status: order.status,
      date: order.createdAt.toISOString().split("T")[0],
    }));

    res
      .status(200)
      .json({ success: true, transactions: formattedTransactions });
  }
);

export const getPerformanceMetrics = controllerWrapper(
  "getPerformanceMetrics",
  async (req, res) => {
    // Build match query based on role
    let matchQuery = {};

    if (req.user.role === "store") {
      const vendorStores = await Store.find({ owner: req.user._id }).select(
        "_id"
      );
      const storeIds = vendorStores.map((store) => store._id);

      if (storeIds.length === 0) {
        return res.status(200).json({
          success: true,
          metrics: {
            conversionRate: 0,
            avgOrderValue: 0,
            itemsPerOrder: 0,
            customerSatisfaction: 0,
          },
        });
      }

      const productIds = await Product.find({
        store: { $in: storeIds },
      }).distinct("_id");
      matchQuery = {
        $or: [
          { store: { $in: storeIds } },
          { "orderItems.product": { $in: productIds } },
        ],
      };
    }

    // Get total orders and completed orders
    const orderStats = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
          totalRevenue: { $sum: "$totalPrice" },
          totalItems: { $sum: { $size: "$orderItems" } },
        },
      },
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      completedOrders: 0,
      totalRevenue: 0,
      totalItems: 0,
    };

    const conversionRate =
      stats.totalOrders > 0
        ? (stats.completedOrders / stats.totalOrders) * 100
        : 0;
    const avgOrderValue =
      stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
    const itemsPerOrder =
      stats.totalOrders > 0 ? stats.totalItems / stats.totalOrders : 0;

    // For customer satisfaction, we'll use a placeholder since we don't have ratings
    const customerSatisfaction = 89; // Placeholder

    res.status(200).json({
      success: true,
      metrics: {
        conversionRate: Math.round(conversionRate * 100) / 100,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        itemsPerOrder: Math.round(itemsPerOrder * 100) / 100,
        customerSatisfaction,
      },
    });
  }
);

export const getRevenueBreakdown = controllerWrapper(
  "getRevenueBreakdown",
  async (req, res) => {
    const { period = "7days" } = req.query;

    // Define date range based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "yesterday":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1
        );
        break;
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Build match query based on role
    let matchQuery = { createdAt: { $gte: startDate } };

    if (req.user.role === "store") {
      const vendorStores = await Store.find({ owner: req.user._id }).select(
        "_id"
      );
      const storeIds = vendorStores.map((store) => store._id);

      if (storeIds.length === 0) {
        return res.status(200).json({
          success: true,
          breakdown: {
            productSales: 0,
            shipping: 0,
            taxes: 0,
            other: 0,
          },
        });
      }

      const productIds = await Product.find({
        store: { $in: storeIds },
      }).distinct("_id");
      matchQuery.$or = [
        { store: { $in: storeIds } },
        { "orderItems.product": { $in: productIds } },
      ];
    }

    // Aggregate revenue breakdown
    const breakdownData = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          productSales: { $sum: "$itemsPrice" },
          shipping: { $sum: "$shippingPrice" },
          taxes: { $sum: "$taxPrice" },
          total: { $sum: "$totalPrice" },
        },
      },
    ]);

    const data = breakdownData[0] || {
      productSales: 0,
      shipping: 0,
      taxes: 0,
      total: 0,
    };

    // Calculate other as total - (productSales + shipping + taxes)
    const other = Math.max(
      0,
      data.total - (data.productSales + data.shipping + data.taxes)
    );

    res.status(200).json({
      success: true,
      breakdown: {
        productSales: Math.round(data.productSales * 100) / 100,
        shipping: Math.round(data.shipping * 100) / 100,
        taxes: Math.round(data.taxes * 100) / 100,
        other: Math.round(other * 100) / 100,
      },
    });
  }
);

export const getSalesTrend = controllerWrapper(
  "getSalesTrend",
  async (req, res) => {
    const { period = "daily", dateRange = "7days" } = req.query;

    // Define date range
    const now = new Date();
    let startDate, groupBy;

    switch (dateRange) {
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90days":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Build match query based on role
    let matchQuery = { createdAt: { $gte: startDate } };

    if (req.user.role === "store") {
      const vendorStores = await Store.find({ owner: req.user._id }).select(
        "_id"
      );
      const storeIds = vendorStores.map((store) => store._id);

      if (storeIds.length === 0) {
        return res.status(200).json({ success: true, trend: [] });
      }

      const productIds = await Product.find({
        store: { $in: storeIds },
      }).distinct("_id");
      matchQuery.$or = [
        { store: { $in: storeIds } },
        { "orderItems.product": { $in: productIds } },
      ];
    }

    // Determine grouping based on period
    let dateFormat, sortOrder;
    switch (period) {
      case "daily":
        groupBy = {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        };
        sortOrder = 1;
        break;
      case "weekly":
        groupBy = {
          $dateToString: {
            format: "%Y-W%V",
            date: "$createdAt",
          },
        };
        sortOrder = 1;
        break;
      case "monthly":
        groupBy = {
          $dateToString: { format: "%Y-%m", date: "$createdAt" },
        };
        sortOrder = 1;
        break;
      default:
        groupBy = {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        };
        sortOrder = 1;
    }

    const trendData = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: groupBy,
          sales: { $sum: "$totalPrice" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: sortOrder } },
      {
        $project: {
          date: "$_id",
          sales: { $round: ["$sales", 2] },
          orders: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({ success: true, trend: trendData });
  }
);
