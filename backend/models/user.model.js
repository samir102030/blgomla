import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const cartItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["product", "collection"],
      default: "product",
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
    },
    quantity: {
      type: Number,
      default: 1,
    },
  },
  { _id: true, suppressReservedKeysWarning: true },
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: [true, "Email already in use"],
    },
    password: {
      type: String,
    },
    name: {
      type: String,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneNumber: {
      type: String,
      // Egyptian E.164 only: +20 followed by 10 digits starting with 1.
      // E.g. +201012345678. Optional at the schema level so admin/seeded
      // users without phone numbers still validate; enforced at the
      // signup validation layer for new customer/store registrations.
      validate: {
        validator: (v) => v == null || v === "" || /^\+201\d{9}$/.test(v),
        message: "phoneNumber must be a valid Egyptian E.164 number (+201XXXXXXXXX)",
      },
    },
    profilePicture: {
      type: String,
    },
    googleId: {
      type: String,
      index: true,
      sparse: true,
    },
    cart: [cartItemSchema],
    // Loyalty points balance. Earned (5%) when orders are delivered, spent at
    // checkout. 1 point = 1 EGP of redeem value (see utils/loyalty.js).
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    // ── Referrals ──
    referralCode: { type: String, unique: true, sparse: true, index: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Paid out once, when this user's first order is delivered.
    referralRewarded: { type: Boolean, default: false },
    // How many of this user's referrals have converted (first order delivered).
    referralCount: { type: Number, default: 0 },
    // Set whenever the cart contents change (see pre-save hook below). Drives
    // abandoned-cart recovery; null when the cart is empty.
    cartUpdatedAt: { type: Date, default: null },
    // Tracks the abandoned-cart email sequence so we never double-send a stage.
    // stage 0 = none sent, 1 = 1h sent, 2 = 24h sent, 3 = 72h sent (final).
    cartRecovery: {
      stage: { type: Number, default: 0 },
      lastSentAt: { type: Date, default: null },
    },
    // Per-channel email opt-outs. Honored by the cron filter for each
    // category before sending. Transactional mail (orders, password
    // reset, verification) is never gated on these.
    emailPreferences: {
      cartRecovery: { type: Boolean, default: true },
      marketing: { type: Boolean, default: true },
    },
    love: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    // References Role.key. Built-ins: customer/store/admin/super_admin, plus
    // any custom role created in Roles & Access. No enum so custom roles work.
    role: {
      type: String,
      default: "customer",
      lowercase: true,
      trim: true,
    },
    deleted: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
    adminExpiresAt: Date,
    adminGrantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Preferred UI language — used to localise transactional emails.
    // Set from the Accept-Language header at signup; updatable from the
    // profile page later. Only two values currently supported.
    lang: { type: String, enum: ["en", "ar"], default: "en" },

    // ── TOTP 2FA (Google Authenticator / Authy / 1Password) ──
    // totpSecret is the base32 shared secret. It is only populated while
    // the user is mid-enrollment; once `twoFactorEnabled` flips to true
    // the secret stays so we can verify codes on future logins.
    twoFactorEnabled: { type: Boolean, default: false },
    totpSecret: { type: String, select: false },
    pushSubscriptions: {
      type: [
        {
          endpoint: { type: String, required: true },
          keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true },
          },
          _id: false,
        },
      ],
      default: [],
      select: false,
    },
  },
  { timestamps: true, suppressReservedKeysWarning: true },
);

// Pre-save hook to lowercase email and hash password before saving to database
userSchema.pre("save", async function (next) {
  if (this.isModified("email")) {
    this.email = this.email.toLowerCase();
  }

  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    console.error("Error hashing password:", error);
    next(error);
  }
});

// Stamp cart-activity time and restart the recovery sequence whenever the cart
// changes. Separate hook so the password hook's early-return can't skip it.
userSchema.pre("save", function (next) {
  if (this.isModified("cart")) {
    const hasItems = Array.isArray(this.cart) && this.cart.length > 0;
    this.cartUpdatedAt = hasItems ? new Date() : null;
    // Fresh activity means any in-flight recovery sequence starts over.
    this.cartRecovery = { stage: 0, lastSentAt: null };
  }
  next();
});

userSchema.methods.generateVerificationToken = function () {
  const token = crypto.randomBytes(20).toString("hex");
  this.verificationToken = crypto
    .createHash("sha256") // define the hash algorithm
    .update(token) // for input
    .digest("hex"); // for output
  this.verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token; // Send raw token to the user
};

userSchema.methods.comparePassword = async function (password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    throw new Error("Error comparing passwords " + error.message);
  }
};

// userSchema.index({ email: 1, phoneNumber: 1, role: 1, isVerified: 1 }); // for searching by email and phone

const User = mongoose.model("User", userSchema);
export default User;
