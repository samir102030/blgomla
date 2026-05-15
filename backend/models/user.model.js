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
    cart: [cartItemSchema],
    love: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    role: {
      type: String,
      enum: ["customer", "store", "admin", "super_admin"],
      default: "customer",
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
    // ── TOTP 2FA (Google Authenticator / Authy / 1Password) ──
    // totpSecret is the base32 shared secret. It is only populated while
    // the user is mid-enrollment; once `twoFactorEnabled` flips to true
    // the secret stays so we can verify codes on future logins.
    twoFactorEnabled: { type: Boolean, default: false },
    totpSecret: { type: String, select: false },
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
