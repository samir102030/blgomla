import Coupon from "../models/coupon.model.js";
import Product from "../models/product.model.js";
import Store from "../models/store.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { paginateQuery } from "../utils/pagination.js";
import { logAudit } from "../utils/audit.js";

/**
 * Coupon access is scoped by store, not by role name.
 *
 * Every management handler below now sits behind a `coupons.*` permission
 * check on the route, so the only question left here is reach: a vendor may
 * touch their own store's coupons, and an operator — an admin, a super_admin,
 * or any custom role granted the permission — may touch all of them.
 *
 * These checks used to read `req.user.role !== "admin"`, which silently
 * treated a super_admin as a vendor: the lookup found no store owned by them
 * and refused them their own coupon pages. `req.store` is set by protectRoute
 * only for vendors, which is the distinction actually being drawn.
 */
const actingAsVendor = (req) => Boolean(req.store);

/** 403 body when the caller may not touch this coupon, otherwise null. */
const denyUnlessOwned = (req, coupon, action) => {
  if (!actingAsVendor(req)) return null;
  const owner = coupon.store?._id ?? coupon.store;
  if (String(owner) === String(req.store._id)) return null;
  return { success: false, message: `Unauthorized to ${action} this coupon` };
};

// Public: list coupons advertised on the storefront (collectible strip).
export const getPublicCoupons = controllerWrapper(
  "getPublicCoupons",
  async (req, res) => {
    const now = new Date();
    const coupons = await Coupon.find({
      isPublic: true,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .select(
        "code description discountType discountValue minimumPurchase maximumDiscount endDate"
      )
      .sort({ discountValue: -1 })
      .limit(12)
      .lean();

    res.status(200).json({ success: true, coupons });
  }
);

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
      isPublic,
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
    if (actingAsVendor(req)) {
      storeId = req.store._id;
    } else {
      storeId = req.body.storeId;

      /*
        An operator with no store of their own gets the shop's, when there is
        only one of them.

        The coupon dialog sends `storeId: undefined` for an admin or a
        super_admin — deliberately, because an operator has no store — and
        this then answered 400 "Store ID is required". So the two roles that
        run the shop could not create a coupon at all, by any route, while a
        vendor could.

        Asking them to choose would be the answer on a marketplace with many
        sellers. This one has a single store, so the question has exactly one
        possible answer and asking it is only a way to fail. The moment there
        is a second store the fallback stops applying and the choice is
        required again — with a message that says which stores exist.
      */
      if (!storeId) {
        const stores = await Store.find({ deleted: { $ne: true } })
          .select("_id name")
          .limit(2)
          .lean();
        if (stores.length === 1) {
          storeId = stores[0]._id;
        } else {
          return res.status(400).json({
            success: false,
            message: stores.length
              ? `This shop has ${stores.length} stores, so a coupon has to say which one it is for.`
              : "There is no store to attach a coupon to yet.",
          });
        }
      }
      // Still checked when the id came from the request, which is the only
      // case where it could name a store that is gone.
      const target = await Store.findById(storeId).select("_id deleted");
      if (!target || target.deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Store not found" });
      }
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
      isPublic: Boolean(isPublic),
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

    logAudit(req, "coupon.created", "coupon", coupon._id, { code: coupon.code });
    res.status(201).json({ success: true, coupon });
  }
);

// Get All Coupons
export const getAllCoupons = controllerWrapper(
  "getAllCoupons",
  async (req, res) => {
    const { page = 1, limit = 20, search, storeId, isActive } = req.query;
    let query = {};

    // Scope by store. Note the previous version had no final `else`: a caller
    // who was neither admin nor store fell through with an empty query and got
    // every coupon in the system, codes included. The route now demands
    // coupons.view, and a vendor is pinned to their own store here.
    if (actingAsVendor(req)) {
      query.store = req.store._id;
    } else if (storeId) {
      query.store = storeId;
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
    const denied = denyUnlessOwned(req, coupon, "view");
    if (denied) return res.status(403).json(denied);

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
    const denied = denyUnlessOwned(req, coupon, "view");
    if (denied) return res.status(403).json(denied);

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
    const denied = denyUnlessOwned(req, coupon, "update");
    if (denied) return res.status(403).json(denied);

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
    const denied = denyUnlessOwned(req, coupon, "delete");
    if (denied) return res.status(403).json(denied);

    // Check if coupon has been used
    if (coupon.usageCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete coupon that has been used",
      });
    }

    await Coupon.findByIdAndDelete(couponId);
    logAudit(req, "coupon.deleted", "coupon", couponId, { code: coupon.code });

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

    // A code addressed to one customer — a student programme code — is refused
    // for anybody else. Same wording as an unknown code on purpose: telling a
    // stranger that the code is real but belongs to someone else invites them
    // to go looking for whose.
    if (coupon.assignedUser && String(coupon.assignedUser) !== String(req.user?._id)) {
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
        // EGP, for the same reason as the copy of this message in
        // order.controller — this is the one the cart shows when a code is
        // typed, so it is the one most customers actually read.
        message: `Minimum purchase of ${coupon.minimumPurchase} EGP required`,
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
          product.category?._id || product.category,
          product.audience
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
    if (actingAsVendor(req) && String(req.store._id) !== String(storeId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view coupons for this store",
      });
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
    const denied = denyUnlessOwned(req, coupon, "update");
    if (denied) return res.status(403).json(denied);

    // Toggle the isActive status
    coupon.isActive = !coupon.isActive;
    await coupon.save();

    await coupon.populate([
      "applicableProducts",
      "applicableCategories",
      "store",
    ]);

    logAudit(req, "coupon.status_toggled", "coupon", coupon._id, { isActive: coupon.isActive, code: coupon.code });
    res.status(200).json({
      success: true,
      coupon,
      message: `Coupon ${
        coupon.isActive ? "activated" : "deactivated"
      } successfully`,
    });
  }
);
