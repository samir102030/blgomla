import BrandRequest from "../models/brandRequest.model.js";
import Brand from "../models/brand.model.js";
import Product from "../models/product.model.js";
import Notification from "../models/notification.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { paginateQuery } from "../utils/pagination.js";

// Get All Brand Requests
export const getAllBrandRequests = controllerWrapper(
  "getAllBrandRequests",
  async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    let query = {};
    if (status) query.status = status;

    const mongooseQuery = BrandRequest.find(query)
      .populate("requestedBy", "name email")
      .populate("store", "name")
      .populate("product", "name")
      .sort({ createdAt: -1 });

    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Brand Request By ID
export const getBrandRequestById = controllerWrapper(
  "getBrandRequestById",
  async (req, res) => {
    const { requestId } = req.params;
    const brandRequest = await BrandRequest.findById(requestId)
      .populate("requestedBy", "name email")
      .populate("store", "name")
      .populate("product", "name")
      .populate("createdBrand");

    if (!brandRequest) {
      return res.status(404).json({
        success: false,
        message: "Brand request not found",
      });
    }

    res.status(200).json({ success: true, data: brandRequest });
  }
);

// Approve Brand Request
export const approveBrandRequest = controllerWrapper(
  "approveBrandRequest",
  async (req, res) => {
    const { requestId } = req.params;
    const adminId = req.user._id;

    const brandRequest = await BrandRequest.findById(requestId)
      .populate("product")
      .populate("requestedBy");

    if (!brandRequest) {
      return res.status(404).json({
        success: false,
        message: "Brand request not found",
      });
    }

    if (brandRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This request has already been processed",
      });
    }

    // Create the new brand
    const newBrand = new Brand({
      name: brandRequest.name,
      description: brandRequest.description,
      isActive: true,
    });
    await newBrand.save();

    // Update brand request
    brandRequest.status = "approved";
    brandRequest.approvedBy = adminId;
    brandRequest.createdBrand = newBrand._id;
    await brandRequest.save();

    // Update product with the new brand
    const product = await Product.findById(brandRequest.product);
    if (product) {
      product.brand = newBrand._id;
      product.pendingBrandRequest = null;

      // Check if product has any other pending requests
      if (!product.pendingCategoryRequest) {
        product.hasPendingRequests = false;
        product.isActive = true; // Publish the product
      }

      await product.save();
    }

    // Notify vendor
    await Notification.create({
      user: brandRequest.requestedBy._id,
      title: "Brand Request Approved",
      message: `Your brand request "${
        brandRequest.name
      }" has been approved. Your product "${product?.name}" is now ${
        !product?.hasPendingRequests ? "published" : "pending other approvals"
      }.`,
      type: "success",
    });

    res.status(200).json({
      success: true,
      message: "Brand request approved",
      brandRequest,
      brand: newBrand,
    });
  }
);

// Reject Brand Request
export const rejectBrandRequest = controllerWrapper(
  "rejectBrandRequest",
  async (req, res) => {
    const { requestId } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    const brandRequest = await BrandRequest.findById(requestId)
      .populate("product")
      .populate("requestedBy");

    if (!brandRequest) {
      return res.status(404).json({
        success: false,
        message: "Brand request not found",
      });
    }

    if (brandRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This request has already been processed",
      });
    }

    // Update brand request
    brandRequest.status = "rejected";
    brandRequest.approvedBy = adminId;
    brandRequest.rejectionReason = reason;
    await brandRequest.save();

    // Update product
    const product = await Product.findById(brandRequest.product);
    if (product) {
      product.pendingBrandRequest = null;

      // Check if product has any other pending requests
      if (!product.pendingCategoryRequest) {
        product.hasPendingRequests = false;
        // Product remains inactive since brand was rejected
      }

      await product.save();
    }

    // Notify vendor
    await Notification.create({
      user: brandRequest.requestedBy._id,
      title: "Brand Request Rejected",
      message: `Your brand request "${
        brandRequest.name
      }" has been rejected. Reason: ${
        reason || "Not specified"
      }. Please update your product.`,
      type: "error",
    });

    res.status(200).json({
      success: true,
      message: "Brand request rejected",
      brandRequest,
    });
  }
);
