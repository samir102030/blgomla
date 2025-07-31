import express from "express";

import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";
import {
  activateUser,
  changeUserRole,
  deActivateUser,
  finalDeleteUser,
  forgotPassword,
  getAllUsers,
  getAllUsersType,
  getDeletedUsers,
  login,
  logout,
  loveProduct,
  reSendVerificationEmail,
  resetPassword,
  restoreUser,
  safeDeleteUser,
  signup,
  updateUser,
  verifyEmail,
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
router.post("/signup", validateSignup, signup);
router.post("/login", validateLogin, login);
router.post("/logout", logout);

// not tested
router.put("/verifyEmail", verifyEmail);
router.post("/generateVerificationCode", reSendVerificationEmail);
router.post("/forgotPassword", validateForgotPassword, forgotPassword);
router.post("/resetPassword/:token", validateResetPassword, resetPassword);

router.route("/").all(protectRoute, adminRoute).get(getAllUsers);
router.get("/usersType", protectRoute, adminRoute, getAllUsersType);

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
router.put("/activateUser/:userId", protectRoute, adminRoute, activateUser);
router.put("/deactivateUser/:userId", protectRoute, adminRoute, deActivateUser);
router.put("/restoreUser/:userId", protectRoute, adminRoute, restoreUser);
router.get("/deletedUsers", protectRoute, adminRoute, getDeletedUsers);

router.post("/loveProduct/:productId", protectRoute, loveProduct);

export default router;
