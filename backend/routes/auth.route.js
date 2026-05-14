import express from "express";
import { rateLimit } from "express-rate-limit";

import {
  adminRoute,
  protectRoute,
  superAdminRoute,
} from "../middleware/auth.middleware.js";
import { verifyRefreshToken } from "../middleware/token.js";

// Strict limiter for credential-handling endpoints. The global limiter in
// app.js is 1000/15min — far too permissive for brute-force protection on
// login/signup/forgot/reset. Keyed by IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
import { translateResponse } from "../middleware/translation.middleware.js";
import {
  activateUser,
  changePassword,
  changeUserRole,
  deActivateUser,
  finalDeleteUser,
  forgotPassword,
  getAllUsers,
  getAllUsersType,
  getDeletedUsers,
  getLovedProducts,
  getProfile,
  login,
  logout,
  loveProduct,
  reSendVerificationEmail,
  refreshToken,
  resetPassword,
  restoreUser,
  safeDeleteUser,
  signup,
  toggleLoveProduct,
  updateProfile,
  updateUser,
  verifyEmail,
  setAdminTime,
  endAdminTimeNow,
} from "../controllers/auth.controller.js";

import {
  validateSignup,
  validateForgotPassword,
  validateLogin,
  validateResetPassword,
} from "../validations/auth.validate.js";
const router = express.Router();

// Tested
// users
router.post("/signup", authLimiter, validateSignup, signup);
router.post("/login", authLimiter, validateLogin, login);
router.post("/logout", logout);
router.post("/refresh", verifyRefreshToken, refreshToken);

router.post("/loveProduct/:productId", protectRoute, loveProduct);
router.get("/loveProducts", protectRoute, getLovedProducts);
router.put("/loveProduct/:productId", protectRoute, toggleLoveProduct); // Toggle love status

// Profile update route for authenticated users
router.get("/profile", protectRoute, getProfile);
router.put("/profile", protectRoute, updateProfile);

// Password change route for authenticated users
router.put("/changePassword", protectRoute, changePassword);

// not tested
router.put("/verifyEmail", verifyEmail);
router.post("/generateVerificationCode", reSendVerificationEmail);
router.post("/forgotPassword", authLimiter, validateForgotPassword, forgotPassword);
router.post("/resetPassword/:token", authLimiter, validateResetPassword, resetPassword);

router
  .route("/")
  .all(protectRoute, adminRoute)
  .get(translateResponse, getAllUsers);
router.get(
  "/usersType",
  protectRoute,
  adminRoute,
  translateResponse,
  getAllUsersType
);

router.delete(
  "/usersFinalDelete/:userId",
  protectRoute,
  adminRoute,
  finalDeleteUser
);
router
  .route("/:userId")
  .all(protectRoute, adminRoute)
  .put(updateUser)
  .delete(safeDeleteUser);

// tested
router.put("/changeRole/:userId", protectRoute, adminRoute, changeUserRole);
router.put(
  "/adminTime/:userId",
  protectRoute,
  superAdminRoute,
  setAdminTime
);
router.put(
  "/adminTimeEnd/:userId",
  protectRoute,
  superAdminRoute,
  endAdminTimeNow
);
router.put("/activateUser/:userId", protectRoute, adminRoute, activateUser);
router.put("/deactivateUser/:userId", protectRoute, adminRoute, deActivateUser);
router.put("/restoreUser/:userId", protectRoute, adminRoute, restoreUser);
router.get(
  "/deletedUsers",
  protectRoute,
  adminRoute,
  translateResponse,
  getDeletedUsers
);

export default router;
