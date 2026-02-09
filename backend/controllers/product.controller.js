import Product from "../models/product.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { paginateQuery } from "../utils/pagination.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import BrandRequest from "../models/brandRequest.model.js";
import CategoryRequest from "../models/categoryRequest.model.js";
import Order from "../models/order.model.js";
import mongoose from "mongoose";

const normalizeBulkPricing = (bulkPricing = []) => {
  if (!Array.isArray(bulkPricing)) return [];
  const cleaned = bulkPricing
    .map((rule) => ({
      minQty: Number(rule?.minQty),
      unitPrice: Number(rule?.unitPrice),
    }))
    .filter(
      (rule) =>
        Number.isFinite(rule.minQty) &&
        Number.isFinite(rule.unitPrice) &&
        rule.minQty >= 1 &&
        rule.unitPrice > 0
    );

  const uniqueByMinQty = new Map();
  for (const rule of cleaned) {
    uniqueByMinQty.set(rule.minQty, rule);
  }

  return Array.from(uniqueByMinQty.values()).sort(
    (a, b) => a.minQty - b.minQty
  );
};

// Create Product
export const createProduct = controllerWrapper(
  "createProduct",
  async (req, res) => {
    const { newBrand, newCategory, bulkPricing, ...productData } = req.body;
    if (bulkPricing !== undefined) {
      productData.bulkPricing = normalizeBulkPricing(bulkPricing);
    }
    const product = new Product(productData);
    product.createdBy = req.user._id;

    if (req.user.role === "store") {
      product.approvalStatus = "pending";
      product.isActive = false;
    } else {
      product.approvalStatus = "approved";
      product.isActive = true;
      product.approvedBy = req.user._id;
      product.approvedAt = new Date();
    }

    let hasPendingRequests = false;
    const userId = req.user._id;

    // Handle new brand request
    if (newBrand && newBrand.name) {
      const brandRequest = new BrandRequest({
        name: newBrand.name,
        description: newBrand.description,
        requestedBy: userId,
        store: productData.store,
        product: product._id,
        status: "pending",
      });
      await brandRequest.save();

      product.pendingBrandRequest = brandRequest._id;
      hasPendingRequests = true;

      // Notify all admin users
      const admins = await User.find({
        role: { $in: ["admin", "super_admin"] },
      });
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          title: "New Brand Request",
          message: `Vendor requested to create a new brand: "${newBrand.name}" for product "${product.name}"`,
          type: "brand_request",
        });
      }
    }

    // Handle new category request
    if (newCategory && newCategory.name) {
      const categoryRequest = new CategoryRequest({
        name: newCategory.name,
        description: newCategory.description,
        requestedBy: userId,
        store: productData.store,
        product: product._id,
        status: "pending",
      });
      await categoryRequest.save();

      product.pendingCategoryRequest = categoryRequest._id;
      hasPendingRequests = true;

      // Notify all admin users
      const admins = await User.find({
        role: { $in: ["admin", "super_admin"] },
      });
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          title: "New Category Request",
          message: `Vendor requested to create a new category: "${newCategory.name}" for product "${product.name}"`,
          type: "category_request",
        });
      }
    }

    // Set product status based on pending requests
    product.hasPendingRequests = hasPendingRequests;
    if (hasPendingRequests) {
      product.isActive = false; // Product won't be published until approved
    }

    await product.save();

    // Create notification for store owner
    const store = await mongoose
      .model("Store")
      .findById(product.store)
      .populate("owner");
    if (store && store.owner) {
      const message = hasPendingRequests
        ? `Your product "${product.name}" has been created and is pending admin approval for new brand/category`
        : `Your product "${product.name}" has been added successfully`;

      await Notification.create({
        user: store.owner._id,
        title: "New Product Added",
        message,
        type: "product",
      });
    }

    res.status(201).json({ success: true, product });
  }
);

// Get All Products (with optional filters/search)
export const getAllProducts = controllerWrapper(
  "getAllProducts",
  async (req, res) => {
    const { page = 1, limit = 20, search, ...filters } = req.query;
    let query = {};
    if (search) {
      // Use case-insensitive partial (regex) matching on name, description and tags
      // to support prefix/substring searches (e.g. "ca" -> "cat golden").
      const regex = new RegExp(
        search.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"),
        "i"
      );
      query.$or = [
        { name: { $regex: regex } },
        { description: { $regex: regex } },
        { tags: { $in: [regex] } },
      ];
    }
    // Add filters (category, brand, etc.)
    if (filters.categoryId) query.Category = filters.categoryId;
    if (filters.brandId) query.brand = filters.brandId;
    if (filters.storeId) query.store = filters.storeId;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.featured !== undefined) query.featured = filters.featured;
    if (filters.saleActive !== undefined) query.saleActive = filters.saleActive;
    if (filters.deleted !== undefined) query.deleted = filters.deleted;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;
    // Price range
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
      if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
    }
    const mongooseQuery = Product.find(query).sort({ createdAt: -1 });
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Sale Products
export const getSaleProducts = controllerWrapper(
  "getsaleProducts",
  async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const query = {
      saleActive: true,
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query);
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Product By Id
export const getProductById = controllerWrapper(
  "getProductById",
  async (req, res) => {
    const { productId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    // For a single product, pagination is not typical, but for consistency:
    const mongooseQuery = Product.find({ _id: productId }).populate(
      "reviews.user"
    );
    const result = await paginateQuery(page, limit, mongooseQuery);
    if (!result.data || result.data.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.status(200).json(result);
  }
);

// Update Product
export const updateProduct = controllerWrapper(
  "updateProduct",
  async (req, res) => {
    const { productId } = req.params;
    const updateData = req.body;
    if (updateData.bulkPricing !== undefined) {
      updateData.bulkPricing = normalizeBulkPricing(updateData.bulkPricing);
    }

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    if (req.user.role === "store") {
      // Vendors cannot self-approve or publish directly
      delete updateData.isActive;
      delete updateData.approvalStatus;
      delete updateData.approvalNotes;
      delete updateData.approvedBy;
      delete updateData.approvedAt;

      Object.assign(product, updateData);
      product.approvalStatus = "pending";
      product.isActive = false;
      product.approvedBy = undefined;
      product.approvedAt = undefined;
      product.approvalNotes = undefined;

      await product.save();
      return res.status(200).json({ success: true, product });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );
    res.status(200).json({ success: true, product: updatedProduct });
  }
);

export const getProductApprovals = controllerWrapper(
  "getProductApprovals",
  async (req, res) => {
    const { status = "pending", page = 1, limit = 20, storeId } = req.query;
    const query = {
      deleted: false,
    };

    if (status !== "all") query.approvalStatus = status;
    if (storeId) query.store = storeId;

    const mongooseQuery = Product.find(query)
      .populate("store")
      .populate("brand")
      .populate("Category")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

export const approveProduct = controllerWrapper(
  "approveProduct",
  async (req, res) => {
    const { productId } = req.params;
    const { note } = req.body || {};

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    product.approvalStatus = "approved";
    product.isActive = true;
    product.approvedBy = req.user._id;
    product.approvedAt = new Date();
    product.approvalNotes = note;

    await product.save();

    // Notify store owner
    const store = await mongoose.model("Store").findById(product.store).populate("owner");
    if (store?.owner) {
      await Notification.create({
        user: store.owner._id,
        title: "Product Approved",
        message: `Your product "${product.name}" has been approved and published`,
        type: "product_approval",
      });
    }

    res.status(200).json({ success: true, product });
  }
);

export const rejectProduct = controllerWrapper(
  "rejectProduct",
  async (req, res) => {
    const { productId } = req.params;
    const { reason } = req.body || {};

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    product.approvalStatus = "rejected";
    product.isActive = false;
    product.approvedBy = req.user._id;
    product.approvedAt = new Date();
    product.approvalNotes = reason || "No reason provided";

    await product.save();

    // Notify store owner
    const store = await mongoose.model("Store").findById(product.store).populate("owner");
    if (store?.owner) {
      await Notification.create({
        user: store.owner._id,
        title: "Product Rejected",
        message: `Your product "${product.name}" was rejected. Reason: ${product.approvalNotes}`,
        type: "product_approval",
      });
    }

    res.status(200).json({ success: true, product });
  }
);

// Delete Product (hard delete)
export const deleteProduct = controllerWrapper(
  "deleteProduct",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findByIdAndDelete(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, message: "Product deleted" });
  }
);

// Soft Delete Product
export const softDeleteProduct = controllerWrapper(
  "softDeleteProduct",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findByIdAndUpdate(
      productId,
      { deleted: true },
      { new: true }
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res
      .status(200)
      .json({ success: true, message: "Product marked as deleted" });
  }
);

// Restore Product
export const restoreProduct = controllerWrapper(
  "restoreProduct",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findByIdAndUpdate(
      productId,
      { deleted: false },
      { new: true }
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, message: "Product restored" });
  }
);

// Toggle Sale Status
export const toggleSaleProduct = controllerWrapper(
  "toggleSaleProduct",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    product.saleActive = !product.saleActive;
    await product.save();
    res.status(200).json({ success: true, saleActive: product.saleActive });
  }
);

// Toggle Featured Status
export const toggleFeaturedProduct = controllerWrapper(
  "toggleFeaturedProduct",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    product.featured = !product.featured;
    await product.save();
    res.status(200).json({ success: true, featured: product.featured });
  }
);

// Update Product Stock
export const updateProductStock = controllerWrapper(
  "updateProductStock",
  async (req, res) => {
    const { productId } = req.params;
    const { stock } = req.body;
    const product = await Product.findByIdAndUpdate(
      productId,
      { stock },
      { new: true, runValidators: true }
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, product });
  }
);

// Filter Products
export const filterProducts = controllerWrapper(
  "filterProducts",
  async (req, res) => {
    const {
      category,
      brand,
      minPrice,
      maxPrice,
      rating,
      featured,
      saleActive,
      store,
      attributes,
      page = 1,
      limit = 20,
    } = req.query;
    let query = {};
    if (category) query.Category = category;
    if (brand) query.brand = brand;
    if (store) query.store = store;
    if (featured !== undefined) query.featured = featured;
    if (saleActive !== undefined) query.saleActive = saleActive;
    if (rating) query.rating = { $gte: Number(rating) };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    // Filter by attributes (array of {name, value})
    if (attributes) {
      try {
        const attrs = JSON.parse(attributes);
        if (Array.isArray(attrs)) {
          query.$and = attrs.map((attr) => ({
            attributes: { $elemMatch: attr },
          }));
        }
      } catch {}
    }
    const mongooseQuery = Product.find(query);
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Featured Products
export const getFeaturedProducts = controllerWrapper(
  "getFeaturedProducts",
  async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const query = {
      featured: true,
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query);
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Products By Category
export const getProductsByCategory = controllerWrapper(
  "getProductsByCategory",
  async (req, res) => {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const query = {
      Category: categoryId,
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query);
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Products By Brand
export const getProductsByBrand = controllerWrapper(
  "getProductsByBrand",
  async (req, res) => {
    const { brandId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const query = {
      brand: brandId,
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query);
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Products By Store
export const getStoreProducts = controllerWrapper(
  "getStoreProducts",
  async (req, res) => {
    const { storeId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const query = {
      store: storeId,
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query);
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Reviews
export const checkReviewEligibility = controllerWrapper(
  "checkReviewEligibility",
  async (req, res) => {
    const { productId } = req.params;
    const userId = req.user._id;

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const hasPaidOrder = await Order.exists({
      user: userId,
      "orderItems.product": productId,
      cancelled: { $ne: true },
      status: { $ne: "cancelled" },
    });

    return res.status(200).json({
      success: true,
      eligible: Boolean(hasPaidOrder),
    });
  }
);

export const addProductReview = controllerWrapper(
  "addProductReview",
  async (req, res) => {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    // Ensure the user has paid for this product before leaving a review
    const hasPaidOrder = await Order.exists({
      user: userId,
      "orderItems.product": productId,
      cancelled: { $ne: true },
      status: { $ne: "cancelled" },
    });

    if (!hasPaidOrder) {
      return res.status(403).json({
        success: false,
        message: "You can only review products you have purchased",
      });
    }
    // Prevent duplicate review by same user
    if (product.reviews.some((r) => r.user.toString() === userId.toString())) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }
    product.reviews.push({ user: userId, rating, comment });
    // Update average rating
    // product.rating =
    //   product.reviews.reduce((acc, r) => acc + r.rating, 0) /
    //   product.reviews.length;
    product.calculateRating();
    await product.save();

    // Create notification for store owner about new review
    const store = await mongoose
      .model("Store")
      .findById(product.store)
      .populate("owner");
    if (store && store.owner) {
      const reviewer = await User.findById(userId);
      await Notification.create({
        user: store.owner._id,
        title: "New Product Review",
        message: `Your product "${product.name}" received a new review from ${
          reviewer?.name || "A customer"
        }`,
        type: "review",
      });
    }

    res.status(201).json({ success: true, reviews: product.reviews });
  }
);

export const updateProductReview = controllerWrapper(
  "updateProductReview",
  async (req, res) => {
    const { productId, reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    const review = product.reviews.id(reviewId);
    if (!review)
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this review",
      });
    }
    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    // Update average rating
    // product.rating =
    //   product.reviews.reduce((acc, r) => acc + r.rating, 0) /
    //   product.reviews.length;
    product.calculateRating();
    await product.save();
    res.status(200).json({ success: true, review });
  }
);

export const deleteProductReview = controllerWrapper(
  "deleteProductReview",
  async (req, res) => {
    const { productId, reviewId } = req.params;
    const userId = req.user._id;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    const review = product.reviews.id(reviewId);
    if (!review)
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this review",
      });
    }
    // review.remove(); // this does not delete the product from the array fix it
    product.reviews = product.reviews.filter(
      (r) => r._id.toString() !== reviewId
    );
    // Update average rating
    // product.rating =
    //   product.reviews.length > 0
    //     ? product.reviews.reduce((acc, r) => acc + r.rating, 0) /
    //       product.reviews.length
    //     : 0;
    product.calculateRating();
    await product.save();
    res.status(200).json({ success: true, message: "Review deleted" });
  }
);

// Features
export const getProductFeatures = controllerWrapper(
  "getProductFeatures",
  async (req, res) => {
    const { productId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const product = await Product.findById(productId, "features");
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    // Paginate features array manually
    const total = product.features.length;
    const start = (page - 1) * limit;
    const end = start + Number(limit);
    const data = product.features.slice(start, end);
    const pages = Math.ceil(total / limit);
    res.status(200).json({
      success: true,
      data,
      total,
      limit: Number(limit),
      page: Number(page),
      pages,
    });
  }
);

export const addProductFeature = controllerWrapper(
  "addProductFeature",
  async (req, res) => {
    const { productId } = req.params;
    const { feature } = req.body;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    product.features.push(feature);
    await product.save();
    res.status(201).json({ success: true, features: product.features });
  }
);

export const updateProductFeature = controllerWrapper(
  "updateProductFeature",
  async (req, res) => {
    const { productId } = req.params;
    const { features } = req.body;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    if (!Array.isArray(features) || features.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Features must be an array" });

    product.features = features;
    await product.save();
    res.status(200).json({ success: true, features: product.features });
  }
);

export const deleteProductFeature = controllerWrapper(
  "deleteProductFeature",
  async (req, res) => {
    const { productId, featureId } = req.params;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    if (!product.features[featureId])
      return res
        .status(404)
        .json({ success: false, message: "Feature not found" });
    product.features.splice(featureId, 1);
    await product.save();
    res.status(200).json({ success: true, features: product.features });
  }
);

// Attributes
export const getProductAttributes = controllerWrapper(
  "getProductAttributes",
  async (req, res) => {
    const { productId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const product = await Product.findById(productId, "attributes");
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    // Paginate attributes array manually
    const total = product.attributes.length;
    const start = (page - 1) * limit;
    const end = start + Number(limit);
    const data = product.attributes.slice(start, end);
    const pages = Math.ceil(total / limit);
    res.status(200).json({
      success: true,
      data,
      total,
      limit: Number(limit),
      page: Number(page),
      pages,
    });
  }
);

export const addProductAttribute = controllerWrapper(
  "addProductAttribute",
  async (req, res) => {
    const { productId } = req.params;
    const { name, value } = req.body;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    product.attributes.push({ name, value });
    await product.save();
    res.status(201).json({ success: true, attributes: product.attributes });
  }
);

export const updateProductAttribute = controllerWrapper(
  "updateProductAttribute",
  async (req, res) => {
    const { productId, attributeId } = req.params;
    const { name, value } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find the attribute by its _id (not array index)
    const attribute = product.attributes.id(attributeId);
    if (!attribute) {
      return res.status(404).json({
        success: false,
        message: "Attribute not found",
      });
    }

    // Update only provided fields
    if (name !== undefined) attribute.name = name;
    if (value !== undefined) attribute.value = value;

    await product.save();

    res.status(200).json({
      success: true,
      attributes: product.attributes,
    });
  }
);

export const deleteProductAttribute = controllerWrapper(
  "deleteProductAttribute",
  async (req, res) => {
    const { productId, attributeId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find the index of the attribute by its _id
    const attributeIndex = product.attributes.findIndex(
      (attr) => attr._id.toString() === attributeId
    );

    if (attributeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Attribute not found",
      });
    }

    // Remove the attribute from the array
    product.attributes.splice(attributeIndex, 1);
    await product.save();

    res.status(200).json({
      success: true,
      attributes: product.attributes,
    });
  }
);

// Get Best Sellers Products
export const getBestSellers = controllerWrapper(
  "getBestSellers",
  async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const query = {
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query).sort({ soldCount: -1 });
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Newest Products
export const getNewestProducts = controllerWrapper(
  "getNewestProducts",
  async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const query = {
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query).sort({ createdAt: -1 });
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);
export const getMostRatedProducts = controllerWrapper(
  "getMostRatedProducts",
  async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const query = {
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query).sort({ rating: -1 });
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// cart
export const addProductToCart = controllerWrapper(
  "addProductToCart",
  async (req, res) => {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user._id;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find user and validate
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if product already in cart
    const existingItemIndex = user.cart.findIndex(
      (item) =>
        (item.type === "product" || !item.type) &&
        item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity if exists
      user.cart[existingItemIndex].quantity += quantity;
    } else {
      // Add new item if doesn't exist
      user.cart.push({
        type: "product",
        product: productId, // Note: using 'product' not 'productId'
        quantity,
      });
    }

    await user.save();

    // Populate product details in response if needed
    const populatedUser = await User.findById(userId).populate("cart.product");

    res.status(201).json({
      success: true,
      cart: populatedUser.cart,
    });
  }
);

export const getCart = controllerWrapper("getCart", async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  res.status(200).json({ success: true, cart: user.cart });
});

// Update Cart
export const updateCart = controllerWrapper("updateCart", async (req, res) => {
  const { quantity } = req.body;
  const { productId } = req.params;
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  // Update cart logic here
  // Assuming you have a User model with a cart field
  console.log(user.cart[0].product.toString());
  const cartItemIndex = user.cart.findIndex(
    (item) =>
      (item.type === "product" || !item.type) &&
      item.product.toString() === productId
  );
  if (cartItemIndex === -1)
    return res.status(404).json({
      success: false,
      message: "Product not found in cart",
    });

  user.cart[cartItemIndex].quantity = quantity;
  await user.save();
  res.status(200).json({ success: true, cart: user.cart });
});

export const removeFromCart = controllerWrapper(
  "removeFromCart",
  async (req, res) => {
    const { productId } = req.params;
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    // Remove from cart logic here
    // Assuming you have a User model with a cart field
    user.cart = user.cart.filter((item) => {
      if (item.type === "collection") return true;
      return item.product.toString() !== productId;
    });
    await user.save();
    console.log(user.cart);
    res.status(200).json({ success: true, cart: user.cart });
  }
);
