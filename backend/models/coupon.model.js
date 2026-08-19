import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Discount value cannot be negative"],
    },
    minimumPurchase: {
      type: Number,
      default: 0,
      min: [0, "Minimum purchase cannot be negative"],
    },
    maximumDiscount: {
      type: Number,
      min: [0, "Maximum discount cannot be negative"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    usageLimit: {
      type: Number,
      min: [1, "Usage limit must be at least 1"],
    },
    usageCount: {
      type: Number,
      default: 0,
      min: [0, "Usage count cannot be negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // When true, the coupon is advertised on the storefront (collectible strip).
    isPublic: {
      type: Boolean,
      default: false,
    },
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      // Every coupon belonged to a store until the student programme, which
      // mints codes on behalf of the platform rather than any one seller.
      // Required unless the coupon is addressed to a single person, which is
      // the only way a platform-wide code is currently created.
      required: function () {
        return !this.assignedUser;
      },
    },
    /**
     * Addressed to one customer. A code with this set is refused for anyone
     * else, in the cart preview and again when the order is charged.
     *
     * This is what makes a personal student code personal: without it, the
     * first student to post their code in a group chat hands the discount to
     * the whole faculty.
     */
    assignedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    /**
     * Restrict the code to one storefront's catalogue.
     *
     * The student section sells its own products, filed in its own
     * departments, so `applicableCategories` — which holds ids from the public
     * category tree — cannot describe "the student shelf". This can, in one
     * field, and it stays true as the shelf changes rather than needing every
     * coupon rewritten each time a department is added.
     *
     * Null means the code does not care, which is every coupon that existed
     * before the section did.
     */
    applicableAudience: {
      type: String,
      enum: ["public", "electronics", null],
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Indexes for better performance
couponSchema.index({ store: 1 });
couponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// Virtual to check if coupon is valid (not expired and active)
couponSchema.virtual("isValid").get(function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.startDate &&
    now <= this.endDate &&
    (!this.usageLimit || this.usageCount < this.usageLimit)
  );
});

// Method to check if coupon can be applied to a product
couponSchema.methods.canApplyToProduct = function (productId, categoryId, audience = "public") {
  // A code minted for one storefront never pays for the other's products.
  // Checked before the product/category lists, because it is a harder rule
  // than either: a student code with no category scope still means "the
  // student shelf", not "everything in the shop".
  if (this.applicableAudience && this.applicableAudience !== (audience || "public")) {
    return false;
  }

  // If no specific products/categories specified, applies to all
  if (
    (!this.applicableProducts || this.applicableProducts.length === 0) &&
    (!this.applicableCategories || this.applicableCategories.length === 0)
  ) {
    return true;
  }

  // Check if product is in applicable products
  if (
    this.applicableProducts &&
    this.applicableProducts.some((product) => {
      const id = product._id || product;
      return id.toString() === productId.toString();
    })
  ) {
    return true;
  }

  // Check if product's category is in applicable categories
  if (
    this.applicableCategories &&
    this.applicableCategories.some((category) => {
      const id = category._id || category;
      return id.toString() === categoryId.toString();
    })
  ) {
    return true;
  }

  return false;
};

// Method to calculate discount amount
couponSchema.methods.calculateDiscount = function (subtotal) {
  if (!this.isValid) return 0;

  let discount = 0;

  if (this.discountType === "percentage") {
    discount = subtotal * (this.discountValue / 100);
  } else {
    discount = Math.min(this.discountValue, subtotal);
  }

  // Apply maximum discount limit if set
  if (this.maximumDiscount && discount > this.maximumDiscount) {
    discount = this.maximumDiscount;
  }

  return discount;
};

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
