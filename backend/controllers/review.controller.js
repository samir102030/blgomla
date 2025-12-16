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

// Toggle review visibility (Admin only)
export const toggleReviewVisibility = controllerWrapper(
  "toggleReviewVisibility",
  async (req, res) => {
    const { productId, reviewId } = req.params;
    const user = req.user;

    // Only admins can hide reviews
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can hide reviews",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
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

// Delete review (admin only)
export const deleteReview = controllerWrapper(
  "deleteReview",
  async (req, res) => {
    const { productId, reviewId } = req.params;
    const user = req.user;

    // Only admins can delete reviews
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete reviews",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
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

// Request to hide a review (vendors only)
export const requestHideReview = controllerWrapper(
  "requestHideReview",
  async (req, res) => {
    const { productId, reviewId } = req.params;
    const user = req.user;

    // Only vendors can request
    if (user.role !== "store") {
      return res.status(403).json({
        success: false,
        message: "Only vendors can request to hide reviews",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Verify the vendor owns this product's store
    const Store = (await import("../models/store.model.js")).default;
    const userStore = await Store.findOne({ owner: user._id });

    if (!userStore || product.store.toString() !== userStore._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only request to hide reviews for your own products",
      });
    }

    const review = product.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check if request already exists with pending status
    const existingRequest = product.reviewRequests?.find(
      (req) =>
        req.review.toString() === reviewId &&
        req.requestType === "hide" &&
        req.status === "pending"
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "A pending request to hide this review already exists",
      });
    }

    // Create new request
    product.reviewRequests = product.reviewRequests || [];
    product.reviewRequests.push({
      review: reviewId,
      requestType: "hide",
      vendorId: user._id,
      status: "pending",
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "Request to hide review submitted successfully",
    });
  }
);

// Request to delete a review (vendors only)
export const requestDeleteReview = controllerWrapper(
  "requestDeleteReview",
  async (req, res) => {
    const { productId, reviewId } = req.params;
    const user = req.user;

    // Only vendors can request
    if (user.role !== "store") {
      return res.status(403).json({
        success: false,
        message: "Only vendors can request to delete reviews",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Verify the vendor owns this product's store
    const Store = (await import("../models/store.model.js")).default;
    const userStore = await Store.findOne({ owner: user._id });

    if (!userStore || product.store.toString() !== userStore._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only request to delete reviews for your own products",
      });
    }

    const review = product.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check if request already exists with pending status
    const existingRequest = product.reviewRequests?.find(
      (req) =>
        req.review.toString() === reviewId &&
        req.requestType === "delete" &&
        req.status === "pending"
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "A pending request to delete this review already exists",
      });
    }

    // Create new request
    product.reviewRequests = product.reviewRequests || [];
    product.reviewRequests.push({
      review: reviewId,
      requestType: "delete",
      vendorId: user._id,
      status: "pending",
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "Request to delete review submitted successfully",
    });
  }
);

// Request to unhide a review (vendors only)
export const requestUnhideReview = controllerWrapper(
  "requestUnhideReview",
  async (req, res) => {
    const { productId, reviewId } = req.params;
    const user = req.user;

    // Only vendors can request
    if (user.role !== "store") {
      return res.status(403).json({
        success: false,
        message: "Only vendors can request to unhide reviews",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Verify the vendor owns this product's store
    const Store = (await import("../models/store.model.js")).default;
    const userStore = await Store.findOne({ owner: user._id });

    if (!userStore || product.store.toString() !== userStore._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only request to unhide reviews for your own products",
      });
    }

    const review = product.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check if request already exists with pending status
    const existingRequest = product.reviewRequests?.find(
      (req) =>
        req.review.toString() === reviewId &&
        req.requestType === "unhide" &&
        req.status === "pending"
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "A pending request to unhide this review already exists",
      });
    }

    // Create new request
    product.reviewRequests = product.reviewRequests || [];
    product.reviewRequests.push({
      review: reviewId,
      requestType: "unhide",
      vendorId: user._id,
      status: "pending",
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "Request to unhide review submitted successfully",
    });
  }
);

// Get vendor's own review requests
export const getVendorReviewRequests = controllerWrapper(
  "getVendorReviewRequests",
  async (req, res) => {
    const user = req.user;

    // Only vendors can view their own requests
    if (user.role !== "store") {
      return res.status(403).json({
        success: false,
        message: "Only vendors can view their own review requests",
      });
    }

    const { page = 1, limit = 20, status } = req.query;

    // Find the store owned by this vendor
    const Store = (await import("../models/store.model.js")).default;
    const userStore = await Store.findOne({ owner: user._id });

    if (!userStore) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        page: Number(page),
        limit: Number(limit),
        pages: 0,
      });
    }

    // Find all products owned by this vendor's store with requests
    const products = await Product.find({
      store: userStore._id,
      "reviewRequests.0": { $exists: true },
    }).populate("store", "name");

    let allRequests = [];
    for (const product of products) {
      for (const request of product.reviewRequests) {
        // Filter by vendor's own requests
        if (request.vendorId.toString() !== user._id.toString()) {
          continue;
        }

        // Filter by status if provided
        if (status && request.status !== status) {
          continue;
        }

        const review = product.reviews.id(request.review);
        const User = (await import("../models/user.model.js")).default;

        let reviewData;
        if (review) {
          const reviewUser = await User.findById(review.user).select(
            "name email"
          );
          reviewData = {
            reviewComment: review.comment,
            reviewRating: review.rating,
            reviewerName: reviewUser?.name,
            reviewerEmail: reviewUser?.email,
          };
        } else {
          // Review has been deleted, but keep the request for history
          reviewData = {
            reviewComment: "[Review Deleted]",
            reviewRating: 0,
            reviewerName: "[Deleted]",
            reviewerEmail: "[Deleted]",
          };
        }

        allRequests.push({
          requestId: request._id,
          productId: product._id,
          productName: product.name,
          reviewId: request.review,
          ...reviewData,
          requestType: request.requestType,
          status: request.status,
          rejectionReason: request.rejectionReason,
          createdAt: request.createdAt,
        });
      }
    }

    // Sort by creation date (newest first)
    allRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const total = allRequests.length;
    const pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedRequests = allRequests.slice(
      startIndex,
      startIndex + Number(limit)
    );

    res.status(200).json({
      success: true,
      data: paginatedRequests,
      total,
      page: Number(page),
      limit: Number(limit),
      pages,
    });
  }
);

// Get review requests (admin only)
export const getReviewRequests = controllerWrapper(
  "getReviewRequests",
  async (req, res) => {
    const user = req.user;

    // Only admins can view requests
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can view review requests",
      });
    }

    const { page = 1, limit = 20, status = "pending" } = req.query;

    // Find all products with pending requests
    const products = await Product.find({
      "reviewRequests.status": status,
    })
      .populate({
        path: "reviewRequests.vendorId",
        select: "name email",
      })
      .populate("store", "name");

    let allRequests = [];
    for (const product of products) {
      for (const request of product.reviewRequests) {
        if (request.status === status) {
          const review = product.reviews.id(request.review);
          const User = (await import("../models/user.model.js")).default;

          let reviewData;
          if (review) {
            const reviewUser = await User.findById(review.user).select(
              "name email"
            );
            reviewData = {
              reviewComment: review.comment,
              reviewRating: review.rating,
              reviewerName: reviewUser?.name,
              reviewerEmail: reviewUser?.email,
            };
          } else {
            // Review has been deleted, but keep the request for history
            reviewData = {
              reviewComment: "[Review Deleted]",
              reviewRating: 0,
              reviewerName: "[Deleted]",
              reviewerEmail: "[Deleted]",
            };
          }

          allRequests.push({
            requestId: request._id,
            productId: product._id,
            productName: product.name,
            reviewId: request.review,
            ...reviewData,
            vendorId: request.vendorId._id,
            vendorName: request.vendorId.name,
            vendorEmail: request.vendorId.email,
            requestType: request.requestType,
            status: request.status,
            rejectionReason: request.rejectionReason,
            createdAt: request.createdAt,
          });
        }
      }
    }

    // Pagination
    const total = allRequests.length;
    const pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedRequests = allRequests.slice(
      startIndex,
      startIndex + Number(limit)
    );

    res.status(200).json({
      success: true,
      data: paginatedRequests,
      total,
      page: Number(page),
      limit: Number(limit),
      pages,
    });
  }
);

// Approve review request (admin only)
export const approveReviewRequest = controllerWrapper(
  "approveReviewRequest",
  async (req, res) => {
    const { productId, requestId } = req.params;
    const user = req.user;

    // Only admins can approve
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can approve review requests",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const request = product.reviewRequests.id(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be approved",
      });
    }

    // Process the request
    if (request.requestType === "hide") {
      const review = product.reviews.id(request.review);
      if (review) {
        review.isVisible = false;
      }
    } else if (request.requestType === "unhide") {
      const review = product.reviews.id(request.review);
      if (review) {
        review.isVisible = true;
      }
    } else if (request.requestType === "delete") {
      product.reviews = product.reviews.filter(
        (r) => r._id.toString() !== request.review.toString()
      );
      product.calculateRating();
    }

    // Update request status
    request.status = "approved";
    await product.save();

    res.status(200).json({
      success: true,
      message: `Review request approved successfully`,
    });
  }
);

// Reject review request (admin only)
export const rejectReviewRequest = controllerWrapper(
  "rejectReviewRequest",
  async (req, res) => {
    const { productId, requestId } = req.params;
    const { rejectionReason } = req.body;
    const user = req.user;

    // Only admins can reject
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can reject review requests",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const request = product.reviewRequests.id(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be rejected",
      });
    }

    // Update request status
    request.status = "rejected";
    request.rejectionReason = rejectionReason || "";
    await product.save();

    res.status(200).json({
      success: true,
      message: `Review request rejected successfully`,
    });
  }
);
