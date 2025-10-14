import Product from "../models/product.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { paginateQuery } from "../utils/pagination.js";

// Get all reviews with role-based filtering
export const getAllReviews = controllerWrapper(
  "getAllReviews",
  async (req, res) => {
    const {
      page = 1,
      limit = 20,
      storeId,
      productId,
      isVisible,
      rating,
      search,
      dateFrom,
      dateTo,
      userEmail,
    } = req.query;
    const user = req.user;

    // Build query based on user role
    let query = {};

    // If user is a store owner, only show reviews for their products
    if (user.role === "store") {
      // Find the store owned by this user
      const Store = (await import("../models/store.model.js")).default;
      const userStore = await Store.findOne({ owner: user._id });

      if (!userStore) {
        return res.status(200).json({
          success: true,
          data: [],
          total: 0,
          limit: Number(limit),
          page: Number(page),
          pages: 0,
        });
      }

      query.store = userStore._id;
    }

    // Additional filters
    if (storeId) query.store = storeId;
    if (productId) query._id = productId;

    // First, find products that match the criteria and have reviews
    query["reviews.0"] = { $exists: true }; // Only products with at least one review
    const products = await Product.find(query).populate("store", "name");

    // Extract and flatten reviews from products
    let allReviews = [];
    for (const product of products) {
      for (const review of product.reviews) {
        // Apply additional filters that can't be done in the query
        if (
          isVisible !== undefined &&
          review.isVisible !== (isVisible === "true")
        ) {
          continue;
        }
        if (rating && review.rating !== Number(rating)) {
          continue;
        }
        if (dateFrom && new Date(review.createdAt) < new Date(dateFrom)) {
          continue;
        }
        if (dateTo && new Date(review.createdAt) > new Date(dateTo)) {
          continue;
        }
        if (userEmail) {
          const User = (await import("../models/user.model.js")).default;
          const reviewUser = await User.findById(review.user).select("email");
          if (
            !reviewUser ||
            !reviewUser.email.toLowerCase().includes(userEmail.toLowerCase())
          ) {
            continue;
          }
        }

        // Get user data
        const User = (await import("../models/user.model.js")).default;
        const reviewUser = await User.findById(review.user).select(
          "name email"
        );

        if (reviewUser) {
          const reviewData = {
            reviewId: review._id,
            productId: product._id,
            productName: product.name,
            storeId: product.store._id,
            storeName: product.store.name,
            userId: review.user,
            userName: reviewUser.name,
            userEmail: reviewUser.email,
            rating: review.rating,
            comment: review.comment,
            isVisible: review.isVisible,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
          };

          // Apply search filter if provided
          if (search) {
            const searchLower = search.toLowerCase();
            const matchesSearch =
              product.name.toLowerCase().includes(searchLower) ||
              reviewUser.name.toLowerCase().includes(searchLower) ||
              reviewUser.email.toLowerCase().includes(searchLower) ||
              (review.comment &&
                review.comment.toLowerCase().includes(searchLower));

            if (!matchesSearch) {
              continue;
            }
          }

          allReviews.push(reviewData);
        }
      }
    }

    // Sort by creation date (newest first)
    allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const total = allReviews.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + Number(limit);
    const paginatedReviews = allReviews.slice(startIndex, endIndex);

    const pages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: paginatedReviews,
      total,
      limit: Number(limit),
      page: Number(page),
      pages,
    });
  }
);

// Toggle review visibility
export const toggleReviewVisibility = controllerWrapper(
  "toggleReviewVisibility",
  async (req, res) => {
    const { productId, reviewId } = req.params;
    const user = req.user;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if user has permission to manage this product's reviews
    if (user.role === "store") {
      // Find the store owned by this user
      const Store = (await import("../models/store.model.js")).default;
      const userStore = await Store.findOne({ owner: user._id });

      if (!userStore || product.store.toString() !== userStore._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to manage reviews for this product",
        });
      }
    }

    const review = product.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Toggle visibility
    review.isVisible = !review.isVisible;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Review ${review.isVisible ? "shown" : "hidden"} successfully`,
      isVisible: review.isVisible,
    });
  }
);

// Delete review (admin/vendor can delete reviews on their products)
export const deleteReview = controllerWrapper(
  "deleteReview",
  async (req, res) => {
    const { productId, reviewId } = req.params;
    const user = req.user;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if user has permission to manage this product's reviews
    if (user.role === "store") {
      // Find the store owned by this user
      const Store = (await import("../models/store.model.js")).default;
      const userStore = await Store.findOne({ owner: user._id });

      if (!userStore || product.store.toString() !== userStore._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete reviews for this product",
        });
      }
    }

    const review = product.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Remove the review
    product.reviews = product.reviews.filter(
      (r) => r._id.toString() !== reviewId
    );

    // Recalculate average rating
    product.calculateRating();
    await product.save();

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  }
);

// Get review statistics
export const getReviewStats = controllerWrapper(
  "getReviewStats",
  async (req, res) => {
    const user = req.user;

    // Build match query based on user role
    let matchQuery = {};
    if (user.role === "store") {
      // Find the store owned by this user
      const Store = (await import("../models/store.model.js")).default;
      const userStore = await Store.findOne({ owner: user._id });

      if (!userStore) {
        return res.status(200).json({
          success: true,
          stats: {
            totalReviews: 0,
            visibleReviews: 0,
            hiddenReviews: 0,
            averageRating: 0,
          },
        });
      }

      matchQuery.store = userStore._id;
    }

    const stats = await Product.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: { $size: "$reviews" } },
          visibleReviews: {
            $sum: {
              $size: {
                $filter: {
                  input: "$reviews",
                  cond: { $eq: ["$$this.isVisible", true] },
                },
              },
            },
          },
          hiddenReviews: {
            $sum: {
              $size: {
                $filter: {
                  input: "$reviews",
                  cond: { $eq: ["$$this.isVisible", false] },
                },
              },
            },
          },
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    const result = stats[0] || {
      totalReviews: 0,
      visibleReviews: 0,
      hiddenReviews: 0,
      averageRating: 0,
    };

    res.status(200).json({
      success: true,
      stats: {
        totalReviews: result.totalReviews,
        visibleReviews: result.visibleReviews,
        hiddenReviews: result.hiddenReviews,
        averageRating: result.averageRating || 0,
      },
    });
  }
);
