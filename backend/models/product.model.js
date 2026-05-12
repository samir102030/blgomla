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

const reviewRequestSchema = new mongoose.Schema(
  {
    review: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    requestType: {
      type: String,
      enum: ["hide", "delete", "unhide"],
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const bulkPricingSchema = new mongoose.Schema(
  {
    minQty: {
      type: Number,
      required: true,
      min: [1, "Minimum quantity must be at least 1"],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0.01, "Unit price must be positive"],
    },
  },
  { _id: false }
);

// ── Price suggestion sub-schema ──
const priceSuggestionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    guestName: { type: String, trim: true },
    suggestedPrice: {
      type: Number,
      required: true,
      min: [0.01, "Suggested price must be positive"],
    },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "reviewed", "accepted", "rejected"],
      default: "pending",
    },
    adminNote: { type: String, trim: true },
  },
  { timestamps: true }
);

// ── Competitor price sub-schema ──
const competitorPriceSchema = new mongoose.Schema(
  {
    competitorName: {
      type: String,
      required: true,
      trim: true,
    },
    competitorUrl: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Competitor price must be non-negative"],
    },
    currency: {
      type: String,
      default: "EGP",
      trim: true,
    },
    lastChecked: {
      type: Date,
      default: Date.now,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: true, timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
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
    // Renamed from "Category" to "category" for consistency
    category: {
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
    minOrderQty: {
      type: Number,
      default: 1,
      min: [1, "Minimum order quantity must be at least 1"],
    },
    images: [
      {
        url: { type: String },
        alt: { type: String },
      },
    ],

    // ── SEO ──
    metaTitle: {
      type: String,
      trim: true,
    },
    metaDescription: {
      type: String,
      trim: true,
    },

    // ── Shipping / Physical ──
    weight: {
      type: Number,
      min: 0,
      default: null,
    },
    dimensions: {
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      depth: { type: Number, min: 0 },
      unit: { type: String, default: "cm", enum: ["cm", "in", "mm"] },
    },

    // ── Sale ──
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

    // ── Approval ──
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvalNotes: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },

    // ── Visibility ──
    isActive: {
      type: Boolean,
      default: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },

    // ── Reviews & Rating ──
    reviews: [reviewSchema],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    // ── Ownership ──
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ── Merchandising ──
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

    // ── Specs ──
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

    // ── Pricing ──
    suggestedPrices: [priceSuggestionSchema],
    competitorPrices: [competitorPriceSchema],
    bulkPricing: {
      type: [bulkPricingSchema],
      default: [],
    },

    // ── Coupons ──
    coupons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
      },
    ],

    // ── Vendor requests ──
    reviewRequests: [reviewRequestSchema],
    pendingBrandRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BrandRequest",
    },
    pendingCategoryRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryRequest",
    },
    hasPendingRequests: {
      type: Boolean,
      default: false,
    },

    // ── Product Variants (future-proof, opt-in) ──
    hasVariants: {
      type: Boolean,
      default: false,
    },
    variants: [
      {
        sku: { type: String, trim: true },
        label: { type: String, trim: true }, // e.g. "Red / Large"
        attributes: [
          {
            name: { type: String, required: true },  // e.g. "Color"
            value: { type: String, required: true }, // e.g. "Red"
          },
        ],
        price: { type: Number, min: 0 },     // Price override (null = use parent price)
        stock: { type: Number, default: 0, min: 0 },
        images: [{ url: String, alt: String }],
        isActive: { type: Boolean, default: true },
      },
    ],
    // Variant option definitions (for generating the selector UI)
    variantOptions: [
      {
        name: { type: String, required: true },      // e.g. "Color"
        values: [{ type: String }],                   // e.g. ["Red", "Blue", "Green"]
      },
    ],
  },
  { timestamps: true }
);

// ── Indexes ──
productSchema.index({ name: "text", description: "text" }); // Full-text search
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ sku: 1 }, { unique: true, sparse: true });
productSchema.index({ category: 1, brand: 1, price: 1 }); // Catalog browsing
productSchema.index({ price: 1, rating: -1 }); // For sorting/filtering
productSchema.index({ isActive: 1, deleted: 1, approvalStatus: 1 }); // Storefront filter
productSchema.index({ soldCount: -1 }); // Best sellers
productSchema.index({ createdAt: -1 }); // Newest

// ── Slug auto-generation ──
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    // Append a short random suffix for uniqueness
    const suffix = this._id
      ? this._id.toString().slice(-4)
      : Math.random().toString(36).slice(-4);
    this.slug = `${baseSlug}-${suffix}`;
  }
  next();
});

// ── Auto-generate SKU if not provided ──
productSchema.pre("save", function (next) {
  if (!this.sku && this.isNew) {
    const prefix = (this.name || "PRD")
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, "X");
    const ts = Date.now().toString(36).toUpperCase();
    this.sku = `${prefix}-${ts}`;
  }
  next();
});

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
