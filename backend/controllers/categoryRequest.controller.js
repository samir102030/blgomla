import CategoryRequest from "../models/categoryRequest.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import Notification from "../models/notification.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { paginateQuery } from "../utils/pagination.js";

// Get All Category Requests
export const getAllCategoryRequests = controllerWrapper(
  "getAllCategoryRequests",
  async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    let query = {};
    if (status) query.status = status;

    const mongooseQuery = CategoryRequest.find(query)
      .populate("requestedBy", "name email")
      .populate("store", "name")
      .populate("product", "name")
      .sort({ createdAt: -1 });

    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Category Request By ID
export const getCategoryRequestById = controllerWrapper(
  "getCategoryRequestById",
  async (req, res) => {
    const { requestId } = req.params;
    const categoryRequest = await CategoryRequest.findById(requestId)
      .populate("requestedBy", "name email")
      .populate("store", "name")
      .populate("product", "name")
      .populate("createdCategory");

    if (!categoryRequest) {
      return res.status(404).json({
        success: false,
        message: "Category request not found",
      });
    }

    res.status(200).json({ success: true, data: categoryRequest });
  }
);

// Approve Category Request
export const approveCategoryRequest = controllerWrapper(
  "approveCategoryRequest",
  async (req, res) => {
    const { requestId } = req.params;
    const adminId = req.user._id;

    const categoryRequest = await CategoryRequest.findById(requestId)
      .populate("product")
      .populate("requestedBy");

    if (!categoryRequest) {
      return res.status(404).json({
        success: false,
        message: "Category request not found",
      });
    }

    if (categoryRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This request has already been processed",
      });
    }

    // Create the new category
    const newCategory = new Category({
      name: categoryRequest.name,
      description: categoryRequest.description,
      isActive: true,
    });
    await newCategory.save();

    // Update category request
    categoryRequest.status = "approved";
    categoryRequest.approvedBy = adminId;
    categoryRequest.createdCategory = newCategory._id;
    await categoryRequest.save();

    // Update product with the new category
    const product = await Product.findById(categoryRequest.product);
    if (product) {
      product.category = newCategory._id;
      product.pendingCategoryRequest = null;

      // Check if product has any other pending requests
      if (!product.pendingBrandRequest) {
        product.hasPendingRequests = false;
        product.isActive = true; // Publish the product
      }

      await product.save();
    }

    // Notify vendor
    await Notification.create({
      user: categoryRequest.requestedBy._id,
      title: "Category Request Approved",
      message: `Your category request "${
        categoryRequest.name
      }" has been approved. Your product "${product?.name}" is now ${
        !product?.hasPendingRequests ? "published" : "pending other approvals"
      }.`,
      type: "success",
    });

    res.status(200).json({
      success: true,
      message: "Category request approved",
      categoryRequest,
      category: newCategory,
    });
  }
);

// Reject Category Request
export const rejectCategoryRequest = controllerWrapper(
  "rejectCategoryRequest",
  async (req, res) => {
    const { requestId } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    const categoryRequest = await CategoryRequest.findById(requestId)
      .populate("product")
      .populate("requestedBy");

    if (!categoryRequest) {
      return res.status(404).json({
        success: false,
        message: "Category request not found",
      });
    }

    if (categoryRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This request has already been processed",
      });
    }

    // Update category request
    categoryRequest.status = "rejected";
    categoryRequest.approvedBy = adminId;
    categoryRequest.rejectionReason = reason;
    await categoryRequest.save();

    // Update product
    const product = await Product.findById(categoryRequest.product);
    if (product) {
      product.pendingCategoryRequest = null;

      // Check if product has any other pending requests
      if (!product.pendingBrandRequest) {
        product.hasPendingRequests = false;
        // Product remains inactive since category was rejected
      }

      await product.save();
    }

    // Notify vendor
    await Notification.create({
      user: categoryRequest.requestedBy._id,
      title: "Category Request Rejected",
      message: `Your category request "${
        categoryRequest.name
      }" has been rejected. Reason: ${
        reason || "Not specified"
      }. Please update your product.`,
      type: "error",
    });

    res.status(200).json({
      success: true,
      message: "Category request rejected",
      categoryRequest,
    });
  }
);
