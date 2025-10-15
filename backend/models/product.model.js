import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price must be positive"],
    },
    Category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    images: [
      {
        url: { type: String },
        alt: { type: String },
      },
    ],
    salePercentage: {
      type: Number,
      min: [0, "Sale percentage cannot be negative"],
      max: [100, "Sale percentage cannot exceed 100"],
      default: 0,
    },
    saleActive: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    reviews: [reviewSchema],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    soldCount: {
      type: Number,
      default: 0,
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    attributes: [
      {
        name: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    coupons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
      },
    ],
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text" }); // Full-text search
productSchema.index({ price: 1, rating: -1 }); // For sorting/filtering

productSchema.virtual("salePrice").get(function () {
  return this.saleActive
    ? this.price * (1 - this.salePercentage / 100)
    : this.price;
});
// method to update calculate rating after a review is added or updated
productSchema.methods.calculateRating = function () {
  const visibleReviews = this.reviews.filter(
    (review) => review.isVisible !== false
  );
  if (visibleReviews.length === 0) {
    this.rating = 0;
    return;
  }
  const totalRating = visibleReviews.reduce(
    (acc, review) => acc + review.rating,
    0
  );
  this.rating = totalRating / visibleReviews.length;
};
// rated
productSchema.virtual("averageRating").get(function () {
  const visibleReviews = this.reviews.filter(
    (review) => review.isVisible !== false
  );
  if (visibleReviews.length === 0) return 0;
  const totalRating = visibleReviews.reduce(
    (acc, review) => acc + review.rating,
    0
  );
  return totalRating / visibleReviews.length;
});

const Product = mongoose.model("Product", productSchema);
export default Product;
