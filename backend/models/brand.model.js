import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Brand name is required"],
      unique: true,
      trim: true,
    },
    nameAr: {
      type: String,
      trim: true,
      default: "",
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    descriptionAr: {
      type: String,
      trim: true,
      default: "",
    },
    logo: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
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

    // ── Display ──
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Whether this brand appears in the storefront's brand strip and menu.
    // Same split as Category: live in the catalogue is not the same decision
    // as featured in the chrome.
    showInMenu: {
      type: Boolean,
      default: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ── Indexes ──
brandSchema.index({ slug: 1 }, { unique: true });
brandSchema.index({ isActive: 1, deleted: 1 });
brandSchema.index({ sortOrder: 1, name: 1 });

// ── Slug auto-generation ──
brandSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

const Brand = mongoose.model("Brand", brandSchema);
export default Brand;
