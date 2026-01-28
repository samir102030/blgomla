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
      required: true,
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
couponSchema.methods.canApplyToProduct = function (productId, categoryId) {
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
