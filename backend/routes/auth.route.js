import express from "express";
import { rateLimit } from "express-rate-limit";

import {
  requirePermission,
  protectRoute,
  superAdminRoute,
} from "../middleware/auth.middleware.js";
import { verifyRefreshToken } from "../middleware/token.js";
import { MongoRateLimitStore } from "../utils/rateLimitStore.js";

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
  // Must be shared: with the default per-process memory store an attacker
  // gets a fresh 10-attempt budget from every warm Lambda, which is the
  // opposite of what a brute-force limiter is for.
  store: new MongoRateLimitStore({ prefix: "rl:auth" }),
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
  getReferralInfo,
  googleSignIn,
  appleSignIn,
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
  setup2FA,
  enable2FA,
  disable2FA,
  exportMyData,
  deleteMyAccount,
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
router.post("/google", authLimiter, googleSignIn);
router.post("/apple", authLimiter, appleSignIn);
router.post("/logout", logout);
router.post("/refresh", verifyRefreshToken, refreshToken);

router.post("/loveProduct/:productId", protectRoute, loveProduct);
router.get("/loveProducts", protectRoute, getLovedProducts);
router.put("/loveProduct/:productId", protectRoute, toggleLoveProduct); // Toggle love status

// Profile update route for authenticated users
router.get("/profile", protectRoute, getProfile);
router.put("/profile", protectRoute, updateProfile);

// Referral info (lazily creates the caller's code)
router.get("/referral", protectRoute, getReferralInfo);

// Password change route for authenticated users
router.put("/changePassword", protectRoute, changePassword);

// Optional TOTP 2FA (Google Authenticator / Authy / 1Password). All three
// endpoints require the user to already be logged in via session cookie.
router.post("/2fa/setup", protectRoute, setup2FA);
router.post("/2fa/enable", protectRoute, enable2FA);
router.post("/2fa/disable", protectRoute, disable2FA);

// GDPR
router.get("/me/data-export", protectRoute, exportMyData);
router.delete("/me/account", protectRoute, deleteMyAccount);

// Verify-email endpoints. /verifyEmail is rate-limited to slow code
// brute force; /generateVerificationCode is rate-limited so attackers
// can't spam a victim's inbox or rapidly invalidate live codes.
router.put("/verifyEmail", authLimiter, verifyEmail);
router.post("/generateVerificationCode", authLimiter, reSendVerificationEmail);
router.post("/forgotPassword", authLimiter, validateForgotPassword, forgotPassword);
router.post("/resetPassword/:token", authLimiter, validateResetPassword, resetPassword);

router
  .route("/")
  .all(protectRoute, requirePermission("users.view"))
  .get(translateResponse, getAllUsers);
router.get(
  "/usersType",
  protectRoute,
  requirePermission("users.view"),
  translateResponse,
  getAllUsersType
);

router.delete(
  "/usersFinalDelete/:userId",
  protectRoute,
  requirePermission("users.delete"),
  finalDeleteUser
);
router
  .route("/:userId")
  .all(protectRoute)
  .put(requirePermission("users.edit"), updateUser)
  .delete(requirePermission("users.delete"), safeDeleteUser);

// tested
router.put("/changeRole/:userId", protectRoute, requirePermission("users.role"), changeUserRole);
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
router.put("/activateUser/:userId", protectRoute, requirePermission("users.activate"), activateUser);
router.put("/deactivateUser/:userId", protectRoute, requirePermission("users.activate"), deActivateUser);
router.put("/restoreUser/:userId", protectRoute, requirePermission("users.delete"), restoreUser);
router.get(
  "/deletedUsers",
  protectRoute,
  requirePermission("users.view"),
  translateResponse,
  getDeletedUsers
);

export default router;
