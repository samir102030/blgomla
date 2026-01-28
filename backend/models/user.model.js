import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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
    },
    profilePicture: {
      type: String,
    },
    cart: [
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
    ],
    love: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    role: {
      type: String,
      enum: ["customer", "store", "admin"],
      default: "customer",
    },
    deleted: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
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
