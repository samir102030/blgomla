import crypto from "crypto";
import User from "../models/user.model.js";
import { paginateQuery } from "../utils/pagination.js";

import {
  generateTokensAndSetCookies,
  generateToken,
} from "../middleware/token.js";
import { controllerWrapper } from "../utils/wrappers.js";
import Store from "../models/store.model.js";
import Product from "../models/product.model.js";
import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
export const signup = controllerWrapper("signup", async (req, res) => {
  const { email, password, name, phoneNumber, role, storeDescription } =
    req.body;

  if (await User.findOne({ email: new RegExp(`^${email}$`, "i") }))
    return res
      .status(400)
      .json({ success: false, message: "User already exists" });

  const verificationToken = crypto.randomBytes(3).toString("hex").toUpperCase();

  const user = new User({
    email,
    password,
    name,
    phoneNumber,
    verificationToken,
    verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    role: role !== "admin" ? role || "customer" : "customer", // default to customer
    lastLogin: new Date(),
    active: true, // Set active to true by default
  });
  if (role === "store") {
    const store = new Store({
      name: user.name,
      owner: user._id,
      description: storeDescription || "Store description",
    });
    await store.save();
  }

  // todo send verification code to the user via email or sms

  await user.save();

  generateTokensAndSetCookies(res, user._id);

  res.status(201).json({
    success: true,
    message: "User created successfully",
    user: {
      ...user._doc,
      password: undefined,
      store: role === "store" ? store : undefined,
    },
  });
});

export const reSendVerificationEmail = controllerWrapper(
  "reSendVerificationEmail",
  async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    if (user.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: "User already verified" });
    }

    const verificationToken = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    user.verificationToken = verificationToken;
    user.verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    await user.save();

    res.status(200).json({
      success: true,
      message: "Verification email sent successfully",
    });
  },
);

export const verifyEmail = controllerWrapper(
  "verifyEmail",
  async (req, res) => {
    const { code, email } = req.body;
    const user = await User.findOne({
      verificationToken: code,
      email,
    });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code or User not found",
      });
    }
    if (user.verificationTokenExpiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Expired verification code",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    // Create account verification notification
    try {
      await Notification.create({
        user: user._id,
        title: "Account Verified",
        message: "Your account has been successfully verified.",
        type: "success",
      });
    } catch (error) {
      console.error("Error creating verification notification:", error);
    }

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  },
);

export const login = controllerWrapper("login", async (req, res) => {
  const { email, phone, password } = req.body;
  let user;
  if (email)
    user = await User.findOne({
      email: new RegExp(`^${email}$`, "i"),
    }).populate("love");
  if (phone) user = await User.findOne({ phones: { $in: [phone] } });
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid)
    return res
      .status(400)
      .json({ success: false, message: "Invalid credentials" });

  generateTokensAndSetCookies(res, user._id);

  user.lastLogin = new Date();
  await user.save();

  // Create login notification
  try {
    await Notification.create({
      user: user._id,
      title: "Welcome Back",
      message: "You have successfully logged in to your account.",
      type: "info",
    });
  } catch (error) {
    console.error("Error creating login notification:", error);
  }

  return res.status(200).json({
    success: true,
    message: "Logged in successfully",
    user: {
      ...user._doc,
      password: undefined,
      store:
        user.role === "store"
          ? await Store.findOne({ owner: user._id })
          : undefined,
    },
  });
});

export const logout = controllerWrapper("logout", async (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return res
    .status(200)
    .json({ success: true, message: "Logged out successfully" });
});

export const refreshToken = controllerWrapper(
  "refreshToken",
  async (req, res) => {
    // This will be called after verifyRefreshToken middleware
    const userId = req.userId;

    // Generate new access token
    const newAccessToken = generateToken(userId, "5h");

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 5 * 60 * 60 * 1000, // five hours
    });

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken: newAccessToken, // Optionally send in response for client-side storage if needed
    });
  },
);

export const forgotPassword = controllerWrapper(
  "forgotPassword",
  async (req, res) => {
    const { email } = req.body;
    console.log("Forgot password request for email:", email);
    const user = await User.findOne({ email: new RegExp(`^${email}$`, "i") });
    console.log("User found:", user ? user.email : "null");

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
      resetToken, // !Danger! must be send via email
    });
  },
);

export const resetPassword = controllerWrapper(
  "resetPassword",
  async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    // Create password reset notification
    try {
      await Notification.create({
        user: user._id,
        title: "Password Updated",
        message: "Your password has been successfully changed.",
        type: "success",
      });
    } catch (error) {
      console.error("Error creating password reset notification:", error);
    }

    res
      .status(200)
      .json({ success: true, message: "Password reset successful" });
  },
);

export const getAllUsers = controllerWrapper(
  "getAllUsers",
  async (req, res) => {
    const { page, limit, role } = req.query;
    const query = role ? User.find({ role }) : User.find({});
    const users = await paginateQuery(page, limit, query);
    if (!users.success) return res.status(400).json(users);
    res.status(200).json(users);
  },
);

export const getAllUsersType = controllerWrapper(
  "getAllUsersType",
  async (req, res) => {
    const { page, limit, type } = req.body;
    const query = User.find({ role: type });
    const users = await paginateQuery(page, limit, query);
    if (!users.success) return res.status(400).json(users);
    res.status(200).json(users);
  },
);

export const updateUser = controllerWrapper("updateUser", async (req, res) => {
  const { userId } = req.params;
  const updateData = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: "User ID is required" });
  }

  // Only allow updating role and active status
  const allowedFields = ["role", "active"];
  const filteredData = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  }

  if (Object.keys(filteredData).length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No valid data provided to update" });
  }

  const updatedUser = await User.findByIdAndUpdate(userId, filteredData, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  return res.status(200).json({ success: true, user: updatedUser });
});

export const safeDeleteUser = controllerWrapper(
  "safeDeleteUser",
  async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { deleted: true },
      { new: true },
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "User marked as deleted" });
  },
);

export const finalDeleteUser = controllerWrapper(
  "finalDeleteUser",
  async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "User permanently deleted" });
  },
);

export const changeUserRole = controllerWrapper(
  "changeUserRole",
  async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    if (role === "admin")
      return res.status(400).json({ message: "Cannot change role to admin" });
    if (!userId || !role)
      return res.status(400).json({ message: "User ID and role are required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = role;
    await user.save();

    res.status(200).json({ message: "User role updated successfully" });
  },
);

export const activateUser = controllerWrapper(
  "activateUser",
  async (req, res) => {
    const { userId } = req.params;

    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.active = true; // Assuming you have an isActive field
    await user.save();

    res.status(200).json({ message: "User activated successfully" });
  },
);

export const deActivateUser = controllerWrapper(
  "deActivateUser",
  async (req, res) => {
    const { userId } = req.params;

    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.active = false; // Assuming you have an isActive field
    await user.save();

    res.status(200).json({ message: "User deactivated successfully" });
  },
);

export const restoreUser = controllerWrapper(
  "restoreUser",
  async (req, res) => {
    const { userId } = req.params;

    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.deleted = false; // Assuming you have a deleted field
    await user.save();

    res.status(200).json({ message: "User restored successfully" });
  },
);
export const getDeletedUsers = controllerWrapper(
  "getDeletedUsers",
  async (req, res) => {
    // use pagination by paginateQuery
    const { page, limit } = req.query;
    const query = User.find({ deleted: true });
    const users = await paginateQuery(page, limit, query);
    if (!users.success) return res.status(400).json(users);
    res.status(200).json(users);
  },
);

// make the product love by user
export const loveProduct = controllerWrapper(
  "loveProduct",
  async (req, res) => {
    const { productId } = req.params;
    const userId = req.user._id;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    // Check if product exists
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Atomic update to prevent race conditions
    const user = await User.findOneAndUpdate(
      {
        _id: userId,
        love: { $ne: productId }, // Only update if not already loved
      },
      { $addToSet: { love: productId } }, // $addToSet prevents duplicates
      { new: true },
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Product already in favorites or user not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product added to favorites",
      user: {
        ...user._doc,
        password: undefined,
        store:
          user.role === "store"
            ? await Store.findOne({ owner: user._id })
            : undefined,
      },
    });
  },
);
export const toggleLoveProduct = controllerWrapper(
  "toggleLoveProduct",
  async (req, res) => {
    const { productId } = req.params;
    const userId = req.user._id;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    // Check if product exists
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check current love status
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const productIndex = user.love.indexOf(productId);
    let message;

    if (productIndex > -1) {
      // Product is in favorites - remove it
      user.love.splice(productIndex, 1);
      message = "Product removed from favorites";
    } else {
      // Product is not in favorites - add it
      user.love.push(productId);
      message = "Product added to favorites";
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message,
      user: {
        ...user._doc,
        password: undefined,
        store:
          user.role === "store"
            ? await Store.findOne({ owner: user._id })
            : undefined,
      },
    });
  },
);

export const getLovedProducts = controllerWrapper(
  "getLovedProducts",
  async (req, res) => {
    const userId = req.user._id;
    const user = await User.findOne({ _id: userId }).populate("love");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      love: user.love, // Return the loved products
    });
  },
);

export const getProfile = controllerWrapper("getProfile", async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId).populate("love");
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Include store data for store users
  const userData = {
    ...user._doc,
    password: undefined,
    store:
      user.role === "store"
        ? await Store.findOne({ owner: user._id })
        : undefined,
  };

  res.status(200).json({
    success: true,
    user: userData,
  });
});

export const changePassword = controllerWrapper(
  "changePassword",
  async (req, res) => {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if current password is correct
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Create password change notification
    try {
      await Notification.create({
        user: user._id,
        title: "Password Updated",
        message: "Your password has been successfully changed.",
        type: "success",
      });
    } catch (error) {
      console.error("Error creating password change notification:", error);
    }

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  },
);

export const updateProfile = controllerWrapper(
  "updateProfile",
  async (req, res) => {
    const userId = req.user._id;
    const { name, phoneNumber, profilePicture } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update allowed fields
    if (name !== undefined) user.name = name;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    // Create profile update notification
    try {
      await Notification.create({
        user: user._id,
        title: "Profile Updated",
        message: "Your profile has been successfully updated.",
        type: "success",
      });
    } catch (error) {
      console.error("Error creating profile update notification:", error);
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  },
);
