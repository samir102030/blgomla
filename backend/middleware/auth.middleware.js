import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Store from "../models/store.model.js";

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

      // If user is a store, check if store is approved
      if (user.role === "store") {
        const store = await Store.findOne({ owner: user._id });
        if (!store || store.status !== "approved" || store.deleted) {
          return res.status(403).json({
            success: false,
            message: "Store is not approved or inactive",
          });
        }
        // Attach store to req for later use
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

// Aliases for compatibility with route imports
export const verifyToken = protectRoute;
export const customerRoute = roleRoute("customer");
export const storeRoute = roleRoute("store");
export const adminRoute = mixRoute(["admin", "super_admin"]);
export const superAdminRoute = roleRoute("super_admin");
export const adminOrStoreRoute = mixRoute(["admin", "super_admin", "store"]);
