import Coupon from "../models/coupon.model.js";
import Product from "../models/product.model.js";
import Store from "../models/store.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { paginateQuery } from "../utils/pagination.js";

// Create Coupon
export const createCoupon = controllerWrapper(
  "createCoupon",
  async (req, res) => {
    const {
      code,
      description,
      discountType,
      discountValue,
      minimumPurchase,
      maximumDiscount,
      startDate,
      endDate,
      usageLimit,
      applicableProducts,
      applicableCategories,
    } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    // Get store based on user role
    let storeId;
    if (req.user.role === "admin") {
      storeId = req.body.storeId;
      if (!storeId) {
        return res.status(400).json({
          success: false,
          message: "Store ID is required for admin",
        });
      }
    } else if (req.user.role === "store") {
      const store = await Store.findOne({ owner: req.user._id });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found for this user",
        });
      }
      storeId = store._id;
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to create coupons",
      });
    }

    // Check if coupon code already exists for this store
    const existingCoupon = await Coupon.findOne({
      code: code.toUpperCase(),
      store: storeId,
    });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists for this store",
      });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      description,
      discountType: discountType || "percentage",
      discountValue,
      minimumPurchase: minimumPurchase || 0,
      maximumDiscount,
      startDate,
      endDate,
      usageLimit,
      applicableProducts,
      applicableCategories,
      store: storeId,
      createdBy: req.user._id,
    });

    await coupon.save();

    // Populate the coupon for response
    await coupon.populate([
      "applicableProducts",
      "applicableCategories",
      "store",
    ]);

    res.status(201).json({ success: true, coupon });
  }
);

// Get All Coupons
export const getAllCoupons = controllerWrapper(
  "getAllCoupons",
  async (req, res) => {
    const { page = 1, limit = 20, search, storeId, isActive } = req.query;
    let query = {};

    // Filter by store based on user role
    if (req.user.role === "admin") {
      if (storeId) query.store = storeId;
    } else if (req.user.role === "store") {
      const store = await Store.findOne({ owner: req.user._id });
      if (store) {
        query.store = store._id;
      } else {
        return res.status(200).json({ success: true, data: [], total: 0 });
      }
    }

    if (search) query.code = { $regex: search, $options: "i" };
    if (isActive !== undefined) query.isActive = isActive === "true";

    const mongooseQuery = Coupon.find(query)
      .populate("store", "name")
      .populate("applicableProducts", "name")
      .populate("applicableCategories", "name")
      .sort({ createdAt: -1 });

    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Coupon By Id
export const getCouponById = controllerWrapper(
  "getCouponById",
  async (req, res) => {
    const { couponId } = req.params;
    const coupon = await Coupon.findById(couponId)
      .populate("store", "name")
      .populate("applicableProducts", "name images price")
      .populate("applicableCategories", "name")
      .populate("createdBy", "name");

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // Check permissions
    if (req.user.role !== "admin") {
      const store = await Store.findOne({ owner: req.user._id });
      if (!store || store._id.toString() !== coupon.store._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to view this coupon",
        });
      }
    }

    res.status(200).json({ success: true, coupon });
  }
);

// Get Coupon By Code
export const getCouponByCode = controllerWrapper(
  "getCouponByCode",
  async (req, res) => {
    const { code } = req.params;
    const coupon = await Coupon.findOne({ code: code.toUpperCase() })
      .populate("store", "name")
      .populate("applicableProducts", "name images price")
      .populate("applicableCategories", "name")
      .populate("createdBy", "name");

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // Check permissions - users can only see coupons from their store or all if admin
    if (req.user.role !== "admin") {
      const store = await Store.findOne({ owner: req.user._id });
      if (!store || store._id.toString() !== coupon.store._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to view this coupon",
        });
      }
    }

    res.status(200).json({ success: true, coupon });
  }
);

// Update Coupon
export const updateCoupon = controllerWrapper(
  "updateCoupon",
  async (req, res) => {
    const { couponId } = req.params;
    const updateData = req.body;

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // Check permissions
    if (req.user.role !== "admin") {
      const store = await Store.findOne({ owner: req.user._id });
      if (!store || store._id.toString() !== coupon.store._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to update this coupon",
        });
      }
    }

    // Validate dates if provided
    if (updateData.startDate && updateData.endDate) {
      if (new Date(updateData.startDate) >= new Date(updateData.endDate)) {
        return res.status(400).json({
          success: false,
          message: "End date must be after start date",
        });
      }
    }

    // Check code uniqueness if code is being updated
    if (updateData.code) {
      const existingCoupon = await Coupon.findOne({
        code: updateData.code.toUpperCase(),
        store: coupon.store,
        _id: { $ne: couponId },
      });
      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: "Coupon code already exists for this store",
        });
      }
      updateData.code = updateData.code.toUpperCase();
    }

    Object.assign(coupon, updateData);
    await coupon.save();

    await coupon.populate([
      "applicableProducts",
      "applicableCategories",
      "store",
    ]);

    res.status(200).json({ success: true, coupon });
  }
);

// Delete Coupon
export const deleteCoupon = controllerWrapper(
  "deleteCoupon",
  async (req, res) => {
    const { couponId } = req.params;

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // Check permissions
    if (req.user.role !== "admin") {
      const store = await Store.findOne({ owner: req.user._id });
      if (!store || store._id.toString() !== coupon.store._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to delete this coupon",
        });
      }
    }

    // Check if coupon has been used
    if (coupon.usageCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete coupon that has been used",
      });
    }

    await Coupon.findByIdAndDelete(couponId);

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  }
);

// Validate Coupon
export const validateCoupon = controllerWrapper(
  "validateCoupon",
  async (req, res) => {
    const { code, cartItems, subtotal } = req.body;

    if (!code || !cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({
        success: false,
        message: "Code, cart items, and subtotal are required",
      });
    }

    // Find coupon by code
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    }).populate("applicableProducts applicableCategories");

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon code",
      });
    }

    // Check if coupon is valid
    if (!coupon.isValid) {
      let message = "Coupon is not valid";
      const now = new Date();
      if (now < coupon.startDate) message = "Coupon has not started yet";
      else if (now > coupon.endDate) message = "Coupon has expired";
      else if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        message = "Coupon usage limit exceeded";
      }
      return res.status(400).json({ success: false, message });
    }

    // Check minimum purchase
    if (subtotal < coupon.minimumPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of $${coupon.minimumPurchase} required`,
      });
    }

    // Check if coupon applies to cart items
    let applicableItems = [];
    for (const item of cartItems) {
      const product = await Product.findById(item.product).populate("Category");
      if (!product) continue;

      if (
        coupon.canApplyToProduct(
          product._id,
          product.category?._id || product.category
        )
      ) {
        applicableItems.push(item);
      }
    }

    if (applicableItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Coupon does not apply to any items in your cart",
      });
    }

    // Calculate discount
    const discount = coupon.calculateDiscount(subtotal);

    res.status(200).json({
      success: true,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minimumPurchase: coupon.minimumPurchase,
        maximumDiscount: coupon.maximumDiscount,
        startDate: coupon.startDate,
        endDate: coupon.endDate,
        usageLimit: coupon.usageLimit,
        usageCount: coupon.usageCount,
        isActive: coupon.isActive,
        applicableProducts: coupon.applicableProducts,
        applicableCategories: coupon.applicableCategories,
        store: coupon.store,
        createdBy: coupon.createdBy,
        createdAt: coupon.createdAt,
        updatedAt: coupon.updatedAt,
        discount,
        applicableItems: applicableItems.length,
      },
    });
  }
);

// Get Store Coupons
export const getStoreCoupons = controllerWrapper(
  "getStoreCoupons",
  async (req, res) => {
    const { storeId } = req.params;
    const { page = 1, limit = 20, isActive } = req.query;

    // Check permissions
    if (req.user.role !== "admin") {
      const store = await Store.findOne({ owner: req.user._id });
      if (!store || store._id.toString() !== storeId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to view coupons for this store",
        });
      }
    }

    let query = { store: storeId };
    if (isActive !== undefined) query.isActive = isActive === "true";

    const mongooseQuery = Coupon.find(query)
      .populate("applicableProducts", "name")
      .populate("applicableCategories", "name")
      .sort({ createdAt: -1 });

    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Toggle Coupon Status
export const toggleCouponStatus = controllerWrapper(
  "toggleCouponStatus",
  async (req, res) => {
    const { couponId } = req.params;

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // Check permissions
    if (req.user.role !== "admin") {
      const store = await Store.findOne({ owner: req.user._id });
      if (!store || store._id.toString() !== coupon.store._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to update this coupon",
        });
      }
    }

    // Toggle the isActive status
    coupon.isActive = !coupon.isActive;
    await coupon.save();

    await coupon.populate([
      "applicableProducts",
      "applicableCategories",
      "store",
    ]);

    res.status(200).json({
      success: true,
      coupon,
      message: `Coupon ${
        coupon.isActive ? "activated" : "deactivated"
      } successfully`,
    });
  }
);
