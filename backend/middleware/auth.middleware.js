import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Store from "../models/store.model.js";
import Product from "../models/product.model.js";
import { userCan } from "../utils/permissions.js";

export const protectRoute = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No access token provided",
      });
    }

    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "User not found" });
      }

      // Check if user is active and not deleted
      if (!user.active || user.deleted) {
        return res.status(403).json({
          success: false,
          message: "Account is inactive or deleted",
        });
      }

      // Admin validity window: if admin expired, downgrade to customer and block admin access
      if (
        user.role === "admin" &&
        user.adminExpiresAt &&
        new Date(user.adminExpiresAt).getTime() < Date.now()
      ) {
        return res.status(403).json({
          success: false,
          message: "Admin access expired",
        });
      }

      // If user is a store, check if store is approved.
      // The Store schema enum allows both "approved" and "active" — treat
      // them as equivalent here so an admin toggling activateStore (which
      // sets status="active") doesn't lock the vendor out.
      if (user.role === "store") {
        const store = await Store.findOne({ owner: user._id });
        const allowed = store && ["approved", "active"].includes(store.status) && !store.deleted;
        if (!allowed) {
          return res.status(403).json({
            success: false,
            message: "Store is not approved or inactive",
          });
        }
        req.store = store;
      }

      req.user = user;

      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Unauthorized - Access token expired" });
      }
      throw error;
    }
  } catch (error) {
    console.log("Error in protectRoute middleware", error.message);
    return res
      .status(401)
      .json({ message: "Unauthorized - Invalid access token" });
  }
};

export const roleRoute = (role) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    const isAllowed =
      userRole === role || (role === "admin" && userRole === "super_admin");
    if (isAllowed) return next();

    return res
      .status(403)
      .json({ message: "Access denied - You Are Not Authorized" });
  };
};
export const mixRoute = (roles) => {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) next();
    else {
      return res
        .status(403)
        .json({ message: "Access denied - You Are Not Authorized" });
    }
  };
};

// Ensures a store user can only act on a product belonging to their own store.
// Admins/super_admins bypass. Must run AFTER protectRoute + adminOrStoreRoute,
// which populate req.user and (for stores) req.store. Reads :productId or :id.
export const requireProductAccess = async (req, res, next) => {
  try {
    // Store users are limited to their own products. Anyone else reaching here
    // already passed a products.* permission check, so they manage all products.
    if (req.user?.role !== "store") return next();
    const productId = req.params.productId || req.params.id;
    const product = await Product.findById(productId).select("store");
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    if (!req.store || String(product.store) !== String(req.store._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only manage your own products",
      });
    }
    return next();
  } catch (error) {
    console.log("Error in requireProductAccess middleware", error.message);
    return res.status(500).json({ success: false, message: "Authorization check failed" });
  }
};

// Fine-grained permission gate. Use after protectRoute. Accepts a single key
// or an array (any-of). Honors "*" and "resource.*" wildcards via the resolver.
export const requirePermission = (keys) => {
  const list = Array.isArray(keys) ? keys : [keys];
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      for (const key of list) {
        if (await userCan(req.user, key)) return next();
      }
      return res
        .status(403)
        .json({ success: false, message: "Access denied - missing permission" });
    } catch (error) {
      console.log("Error in requirePermission middleware", error.message);
      return res
        .status(500)
        .json({ success: false, message: "Authorization check failed" });
    }
  };
};

// Aliases for compatibility with route imports
export const verifyToken = protectRoute;
export const customerRoute = roleRoute("customer");
export const storeRoute = roleRoute("store");
export const adminRoute = mixRoute(["admin", "super_admin"]);
export const superAdminRoute = roleRoute("super_admin");
export const adminOrStoreRoute = mixRoute(["admin", "super_admin", "store"]);
