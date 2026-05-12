import Visitor from "../models/visitor.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

/**
 * Get visitor statistics overview
 * GET /api/analytics/visitors/stats
 */
export const getVisitorStats = controllerWrapper("getVisitorStats", async (req, res) => {
  const { startDate, endDate, period = "30d" } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
  } else {
    // Default periods
    const now = new Date();
    const periods = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "1y": 365,
    };
    const days = periods[period] || 30;
    dateFilter = {
      createdAt: { $gte: new Date(now - days * 24 * 60 * 60 * 1000) },
    };
  }

  // Total unique visitors
  const totalVisitors = await Visitor.countDocuments(dateFilter);

  // Total page views
  const pageViewsAgg = await Visitor.aggregate([
    { $match: dateFilter },
    { $project: { pageCount: { $size: "$pagesVisited" } } },
    { $group: { _id: null, total: { $sum: "$pageCount" } } },
  ]);
  const totalPageViews = pageViewsAgg[0]?.total || 0;

  // Today's visitors
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayVisitors = await Visitor.countDocuments({
    createdAt: { $gte: today },
  });

  // Visitors over time (daily)
  const visitorsOverTime = await Visitor.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
        pageViews: { $sum: { $size: "$pagesVisited" } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    data: {
      totalVisitors,
      totalPageViews,
      todayVisitors,
      avgPagesPerVisit:
        totalVisitors > 0
          ? Math.round((totalPageViews / totalVisitors) * 10) / 10
          : 0,
      visitorsOverTime,
    },
  });
});

/**
 * Get device breakdown
 * GET /api/analytics/visitors/devices
 */
export const getDeviceBreakdown = controllerWrapper("getDeviceBreakdown", async (req, res) => {
  const { period = "30d" } = req.query;
  const days = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[period] || 30;
  const dateFilter = {
    createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
  };

  const devices = await Visitor.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: "$device",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const browsers = await Visitor.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: "$browser",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const operatingSystems = await Visitor.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: "$os",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  res.json({
    success: true,
    data: { devices, browsers, operatingSystems },
  });
});

/**
 * Get location breakdown
 * GET /api/analytics/visitors/locations
 */
export const getLocationBreakdown = controllerWrapper("getLocationBreakdown", async (req, res) => {
  const { period = "30d" } = req.query;
  const days = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[period] || 30;
  const dateFilter = {
    createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
  };

  // By country
  const countries = await Visitor.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: "$country",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);

  // Egyptian governorates
  const governorates = await Visitor.aggregate([
    { $match: { ...dateFilter, countryCode: "EG" } },
    {
      $group: {
        _id: "$governorate",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // By city
  const cities = await Visitor.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { city: "$city", country: "$country" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);

  res.json({
    success: true,
    data: { countries, governorates, cities },
  });
});

/**
 * Get top pages
 * GET /api/analytics/visitors/pages
 */
export const getTopPages = controllerWrapper("getTopPages", async (req, res) => {
  const { period = "30d" } = req.query;
  const days = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[period] || 30;
  const dateFilter = {
    createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
  };

  const topPages = await Visitor.aggregate([
    { $match: dateFilter },
    { $unwind: "$pagesVisited" },
    {
      $group: {
        _id: "$pagesVisited.path",
        views: { $sum: 1 },
        uniqueVisitors: { $addToSet: "$sessionId" },
      },
    },
    {
      $project: {
        _id: 1,
        views: 1,
        uniqueVisitors: { $size: "$uniqueVisitors" },
      },
    },
    { $sort: { views: -1 } },
    { $limit: 20 },
  ]);

  res.json({
    success: true,
    data: { topPages },
  });
});
