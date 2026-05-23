import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
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
import { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail } from "../utils/email.js";
import { logAudit } from "../utils/audit.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const isSuperAdmin = (user) => user?.role === "super_admin";

const guardSuperAdminMutation = async (targetUserId, actor) => {
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return { status: 404, body: { success: false, message: "User not found" } };
  }
  if (isSuperAdmin(targetUser) && !isSuperAdmin(actor)) {
    return {
      status: 403,
      body: { success: false, message: "Cannot modify a super admin account" },
    };
  }
  return { targetUser };
};
export const signup = controllerWrapper("signup", async (req, res) => {
  const { email, password, name, phoneNumber, role, storeDescription, referralCode } =
    req.body;

  if (await User.findOne({ email: new RegExp(`^${email}$`, "i") }))
    return res
      .status(400)
      .json({ success: false, message: "User already exists" });

  // Resolve a referral code to the referring user (best-effort — a bad code
  // never blocks signup).
  let referredBy;
  if (referralCode && String(referralCode).trim()) {
    const referrer = await User.findOne({
      referralCode: String(referralCode).trim().toUpperCase(),
    }).select("_id");
    if (referrer) referredBy = referrer._id;
  }

  const verificationToken = crypto.randomBytes(3).toString("hex").toUpperCase();

  // Capture the user's preferred language from the Accept-Language header
  // so transactional emails go out in the right locale. Front-end's axios
  // client already sends "Accept-Language: en" or "ar" on every request.
  const acceptLang = String(req.headers["accept-language"] || "").toLowerCase();
  const lang = acceptLang.startsWith("ar") ? "ar" : "en";

  const user = new User({
    email,
    password,
    name,
    phoneNumber,
    lang,
    verificationToken,
    verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    role: role !== "admin" ? role || "customer" : "customer", // default to customer
    referredBy,
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

  await user.save();

  // Send welcome email with verification code (non-blocking).
  sendWelcomeEmail(user).catch((err) =>
    console.error("Failed to send welcome email:", err)
  );

  // Do NOT issue cookies here. The user must verify their email before a
  // session is created — the /verifyEmail endpoint sets cookies on success.
  // This prevents the half-state where a fresh signup is briefly logged in
  // but every protected request 403s with EMAIL_NOT_VERIFIED.

  res.status(201).json({
    success: true,
    message: "User created. Check your email for a verification code.",
    requiresVerification: true,
    user: {
      ...user._doc,
      password: undefined,
      verificationToken: undefined,
      verificationTokenExpiresAt: undefined,
      store: role === "store" ? store : undefined,
    },
  });
});

// Generate a short, unique referral code (best-effort retry on collision).
const generateReferralCode = async () => {
  for (let i = 0; i < 5; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    if (!(await User.exists({ referralCode: code }))) return code;
  }
  return crypto.randomBytes(6).toString("hex").toUpperCase();
};

// GET /api/users/referral — returns the caller's referral code (lazily created)
// plus how many referrals have converted.
export const getReferralInfo = controllerWrapper(
  "getReferralInfo",
  async (req, res) => {
    let user = await User.findById(req.user._id).select(
      "referralCode referralCount"
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!user.referralCode) {
      const code = await generateReferralCode();
      user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { referralCode: code } },
        { new: true }
      ).select("referralCode referralCount");
    }
    res.status(200).json({
      success: true,
      referralCode: user.referralCode,
      referralCount: user.referralCount || 0,
    });
  }
);

export const reSendVerificationEmail = controllerWrapper(
  "reSendVerificationEmail",
  async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }
    const user = await User.findOne({
      email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });

    // Don't reveal whether the email exists — return the same response
    // either way to prevent account enumeration via this endpoint.
    if (!user || user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "If the email is registered and unverified, a code has been sent.",
      });
    }

    // Match the signup code shape (6 uppercase hex chars) so verifyEmail's
    // toUpperCase() normalization works uniformly across both paths.
    const verificationToken = crypto.randomBytes(3).toString("hex").toUpperCase();

    user.verificationToken = verificationToken;
    user.verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000;

    await user.save();

    // Send verification email (non-blocking)
    sendVerificationEmail(user).catch((err) =>
      console.error("Failed to send verification email:", err)
    );

    res.status(200).json({
      success: true,
      message: "If the email is registered and unverified, a code has been sent.",
    });
  },
);

export const verifyEmail = controllerWrapper(
  "verifyEmail",
  async (req, res) => {
    const { code, email } = req.body;
    if (!code || !email) {
      return res.status(400).json({
        success: false,
        message: "Email and code are required",
      });
    }
    // Signup generates the code with .toUpperCase() but the resend path
    // emits a numeric code; accept either by normalising the comparison.
    // Email lookup is also case-insensitive since the DB pre-save hook
    // lowercases new emails but we can't assume that's true of legacy rows.
    const normalizedCode = String(code).trim().toUpperCase();
    const user = await User.findOne({
      email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (!user || !user.verificationToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code or User not found",
      });
    }
    if (String(user.verificationToken).toUpperCase() !== normalizedCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }
    if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Expired verification code",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

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

    // Issue cookies so the user lands already logged in. Skipped only if
    // 2FA is enabled — those users must complete the second factor flow
    // through /login, not via this endpoint.
    if (!user.twoFactorEnabled) {
      generateTokensAndSetCookies(res, user._id);
    }

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: {
        ...user._doc,
        password: undefined,
        totpSecret: undefined,
        store:
          user.role === "store"
            ? await Store.findOne({ owner: user._id })
            : undefined,
      },
    });
  },
);

export const login = controllerWrapper("login", async (req, res) => {
  const { email, phone, password, totpCode } = req.body;
  let user;
  if (email)
    user = await User.findOne({
      email: new RegExp(`^${email}$`, "i"),
    }).select("+totpSecret").populate("love");
  if (phone) user = await User.findOne({ phoneNumber: phone }).select("+totpSecret");
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

  // Require verified email before issuing a session. Existing rows where
  // isVerified is undefined are treated as not-yet-verified.
  if (!user.isVerified) {
    return res.status(403).json({
      success: false,
      code: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email before logging in. We sent a code to your inbox.",
    });
  }

  // Optional second factor. If the user has enrolled in TOTP, require a
  // valid code before issuing cookies. Front-end signals enrollment by
  // first POSTing without totpCode (gets a 401 + code:"TOTP_REQUIRED"),
  // then re-posting with the 6-digit code from the authenticator app.
  if (user.twoFactorEnabled) {
    if (!totpCode) {
      return res.status(401).json({
        success: false,
        code: "TOTP_REQUIRED",
        message: "Enter the 6-digit code from your authenticator app.",
      });
    }
    const { verifyTOTP } = await import("../utils/totp.js");
    if (!verifyTOTP(user.totpSecret, totpCode)) {
      return res.status(401).json({
        success: false,
        code: "TOTP_INVALID",
        message: "Invalid authenticator code.",
      });
    }
  }

  generateTokensAndSetCookies(res, user._id);

  user.lastLogin = new Date();
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Logged in successfully",
    user: {
      ...user._doc,
      password: undefined,
      totpSecret: undefined,
      store:
        user.role === "store"
          ? await Store.findOne({ owner: user._id })
          : undefined,
    },
  });
});

export const googleSignIn = controllerWrapper("googleSignIn", async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({
      success: false,
      message: "Missing Google credential",
    });
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({
      success: false,
      message: "Google Sign-In is not configured on the server",
    });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid Google credential",
    });
  }

  const { sub: googleId, email, name, picture, email_verified } = payload || {};
  if (!email || !email_verified) {
    return res.status(400).json({
      success: false,
      message: "Google account email is missing or unverified",
    });
  }

  const acceptLang = String(req.headers["accept-language"] || "").toLowerCase();
  const lang = acceptLang.startsWith("ar") ? "ar" : "en";

  let user = await User.findOne({
    $or: [{ googleId }, { email: new RegExp(`^${email}$`, "i") }],
  });

  if (user) {
    let dirty = false;
    if (!user.googleId) { user.googleId = googleId; dirty = true; }
    if (!user.isVerified) { user.isVerified = true; dirty = true; }
    if (!user.profilePicture && picture) { user.profilePicture = picture; dirty = true; }
    if (!user.name && name) { user.name = name; dirty = true; }
    user.lastLogin = new Date();
    if (dirty) await user.save();
    else await user.save();
  } else {
    user = await User.create({
      email,
      name,
      googleId,
      profilePicture: picture,
      isVerified: true,
      role: "customer",
      active: true,
      lang,
      lastLogin: new Date(),
    });
    sendWelcomeEmail(user).catch((err) =>
      console.error("Failed to send welcome email:", err)
    );
  }

  if (user.twoFactorEnabled) {
    return res.status(401).json({
      success: false,
      code: "TOTP_REQUIRED",
      message: "Enter the 6-digit code from your authenticator app.",
    });
  }

  generateTokensAndSetCookies(res, user._id);

  return res.status(200).json({
    success: true,
    message: "Signed in with Google",
    user: {
      ...user._doc,
      password: undefined,
      totpSecret: undefined,
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
    const genericResponse = {
      success: true,
      message: "If an account exists for that email, a reset link has been sent.",
    };

    if (typeof email !== "string" || !email.trim()) {
      return res.status(200).json(genericResponse);
    }

    const escaped = email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const user = await User.findOne({ email: new RegExp(`^${escaped}$`, "i") });

    if (!user) {
      console.log("[forgotPassword] no account for:", email);
      return res.status(200).json(genericResponse);
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = Date.now() + 1 * 60 * 60 * 1000;
    await user.save();

    sendPasswordResetEmail(user, resetToken).catch((err) =>
      console.error("Failed to send password reset email:", err)
    );

    return res.status(200).json(genericResponse);
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

  const guard = await guardSuperAdminMutation(userId, req.user);
  if (guard.status) return res.status(guard.status).json(guard.body);

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

    const guard = await guardSuperAdminMutation(userId, req.user);
    if (guard.status) return res.status(guard.status).json(guard.body);

    const user = await User.findByIdAndUpdate(
      userId,
      { deleted: true },
      { new: true },
    );

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

    const guard = await guardSuperAdminMutation(userId, req.user);
    if (guard.status) return res.status(guard.status).json(guard.body);

    const user = await User.findByIdAndDelete(userId);

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

  const guard = await guardSuperAdminMutation(userId, req.user);
  if (guard.status) return res.status(guard.status).json(guard.body);

  const user = guard.targetUser;

  user.role = role;
  await user.save();

    res.status(200).json({ message: "User role updated successfully" });
  },
);

export const setAdminTime = controllerWrapper(
  "setAdminTime",
  async (req, res) => {
    const { userId } = req.params;
    const { days = 0, hours = 0, minutes = 0 } = req.body;

    if (!userId)
      return res.status(400).json({ message: "User ID is required" });
    if (days <= 0 && hours <= 0 && minutes <= 0)
      return res
        .status(400)
        .json({ message: "Provide a positive duration in days, hours or minutes" });

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role !== "admin")
      return res
        .status(400)
        .json({ message: "Target user must be an admin" });

    const now = Date.now();
    const durationMs =
      Number(days) * 24 * 60 * 60 * 1000 +
      Number(hours) * 60 * 60 * 1000 +
      Number(minutes) * 60 * 1000;
    target.adminExpiresAt = new Date(now + durationMs);
    target.adminGrantedBy = req.user._id;
    await target.save();

    res.status(200).json({
      success: true,
      message: "Admin time window updated",
      user: target,
    });
  }
);

export const endAdminTimeNow = controllerWrapper(
  "endAdminTimeNow",
  async (req, res) => {
    const { userId } = req.params;
    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role !== "admin")
      return res
        .status(400)
        .json({ message: "Target user must be an admin" });

    target.adminExpiresAt = new Date(Date.now() - 1000);
    target.adminGrantedBy = req.user._id;
    await target.save();

    res.status(200).json({ success: true, message: "Admin access ended now" });
  }
);

export const activateUser = controllerWrapper(
  "activateUser",
  async (req, res) => {
    const { userId } = req.params;

    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    const guard = await guardSuperAdminMutation(userId, req.user);
    if (guard.status) return res.status(guard.status).json(guard.body);

    const user = guard.targetUser;

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

    const guard = await guardSuperAdminMutation(userId, req.user);
    if (guard.status) return res.status(guard.status).json(guard.body);

    const user = guard.targetUser;

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

    const guard = await guardSuperAdminMutation(userId, req.user);
    if (guard.status) return res.status(guard.status).json(guard.body);

    const user = guard.targetUser;

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

    // Compare as strings — `user.love` stores ObjectIds, productId arrives
    // as a string from req.params, and Array.indexOf uses strict equality,
    // so the naive comparison never matched and toggle always re-added.
    const existing = await User.findById(userId).select("love");
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const isLoved = existing.love.some((id) => id.toString() === productId);

    const update = isLoved
      ? { $pull: { love: productId } }
      : { $addToSet: { love: productId } };
    const message = isLoved
      ? "Product removed from favorites"
      : "Product added to favorites";

    const user = await User.findByIdAndUpdate(userId, update, { new: true });

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

// ── TOTP 2FA ───────────────────────────────────────────────────────────
// Flow:
//   1. Authenticated user calls POST /users/2fa/setup -> we generate a
//      fresh secret, store it (but leave twoFactorEnabled=false), and
//      return a QR code data URL + the base32 secret for manual entry.
//   2. User scans QR with Google Authenticator (or similar), then POSTs
//      the 6-digit code to /users/2fa/enable. On verify success we flip
//      twoFactorEnabled=true.
//   3. To disable, user POSTs current password + current TOTP code to
//      /users/2fa/disable.

export const setup2FA = controllerWrapper("setup2FA", async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId).select("+totpSecret");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  if (user.twoFactorEnabled) {
    return res.status(400).json({
      success: false,
      message: "Two-factor authentication is already enabled. Disable it first to reset.",
    });
  }

  const { generateTOTPSecret, buildOtpAuthUrl, buildQRCodeDataUrl } =
    await import("../utils/totp.js");

  const secret = generateTOTPSecret();
  user.totpSecret = secret;
  await user.save();

  const otpauthUrl = buildOtpAuthUrl(secret, user.email);
  const qrCodeDataUrl = await buildQRCodeDataUrl(otpauthUrl);

  return res.status(200).json({
    success: true,
    message: "Scan the QR code with your authenticator app, then submit the 6-digit code to /2fa/enable.",
    qrCodeDataUrl,
    secret, // Shown for manual entry; never returned again after enable.
  });
});

export const enable2FA = controllerWrapper("enable2FA", async (req, res) => {
  const userId = req.user._id;
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: "Code is required" });
  }
  const user = await User.findById(userId).select("+totpSecret");
  if (!user || !user.totpSecret) {
    return res.status(400).json({
      success: false,
      message: "No 2FA setup in progress. Call /2fa/setup first.",
    });
  }
  const { verifyTOTP } = await import("../utils/totp.js");
  if (!verifyTOTP(user.totpSecret, code)) {
    return res.status(400).json({ success: false, message: "Invalid code" });
  }
  user.twoFactorEnabled = true;
  await user.save();
  return res.status(200).json({
    success: true,
    message: "Two-factor authentication enabled.",
  });
});

export const disable2FA = controllerWrapper("disable2FA", async (req, res) => {
  const userId = req.user._id;
  const { password, code } = req.body;
  if (!password || !code) {
    return res.status(400).json({
      success: false,
      message: "Current password and current authenticator code are both required.",
    });
  }
  const user = await User.findById(userId).select("+totpSecret");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  const passwordOk = await user.comparePassword(password);
  if (!passwordOk) {
    return res.status(400).json({ success: false, message: "Invalid password" });
  }
  const { verifyTOTP } = await import("../utils/totp.js");
  if (!verifyTOTP(user.totpSecret, code)) {
    return res.status(400).json({ success: false, message: "Invalid code" });
  }
  user.twoFactorEnabled = false;
  user.totpSecret = undefined;
  await user.save();
  return res.status(200).json({
    success: true,
    message: "Two-factor authentication disabled.",
  });
});

// ── GDPR: export all personal data ──────────────────────────────────────────
export const exportMyData = controllerWrapper("exportMyData", async (req, res) => {
  const userId = req.user._id;

  const [user, orders, addresses, notifications, notifPrefs] = await Promise.all([
    User.findById(userId)
      .select("-password -resetPasswordToken -verificationToken -totpSecret -pushSubscriptions")
      .lean(),
    mongoose.model("Order").find({ user: userId }).lean(),
    mongoose.model("Address").find({ user: userId }).lean(),
    mongoose.model("Notification").find({ user: userId, deleted: false }).lean(),
    mongoose.model("NotificationPreferences").findOne({ user: userId }).lean(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: user,
    orders,
    addresses,
    notifications,
    notificationPreferences: notifPrefs,
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="belgomla-data-${userId}.json"`
  );
  res.status(200).json(payload);
});

// ── GDPR: self-service account deletion ─────────────────────────────────────
export const deleteMyAccount = controllerWrapper("deleteMyAccount", async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: "Password is required to confirm deletion" });
  }

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const passwordOk = await user.comparePassword(password);
  if (!passwordOk) {
    return res.status(400).json({ success: false, message: "Incorrect password" });
  }

  const ts = Date.now();
  // Anonymise all PII — keep the document so relational data stays intact.
  await User.findByIdAndUpdate(req.user._id, {
    email: `deleted_${ts}@deleted.invalid`,
    name: "Deleted User",
    phoneNumber: undefined,
    profilePicture: undefined,
    googleId: undefined,
    cart: [],
    love: [],
    pushSubscriptions: [],
    referralCode: undefined,
    deleted: true,
    active: false,
  });

  // Cancel any open orders so stock is not held indefinitely.
  await mongoose.model("Order").updateMany(
    { user: req.user._id, status: { $in: ["pending", "confirmed", "processing"] } },
    { status: "cancelled", cancelled: true }
  );

  logAudit(req, "user.self_deleted", "user", req.user._id);

  // Clear auth cookies.
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  res.status(200).json({ success: true, message: "Account deleted." });
});
