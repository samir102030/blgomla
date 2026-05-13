import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
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
    image: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    subCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    // ── Tree helpers ──
    level: {
      type: Number,
      default: 0, // 0 = root, 1 = child, etc.
    },
    path: {
      type: String,
      default: "", // materialized path e.g. "/electronics/phones"
      trim: true,
    },

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
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ── Indexes ──
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ path: 1 });
categorySchema.index({ isActive: 1, deleted: 1 });
categorySchema.index({ sortOrder: 1, name: 1 });

// ── Slug auto-generation (always update on name change) ──
categorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

// ── Auto-compute level and path from parent ──
categorySchema.pre("save", async function (next) {
  if (this.isModified("parentCategory")) {
    if (this.parentCategory) {
      const parent = await mongoose
        .model("Category")
        .findById(this.parentCategory);
      if (parent) {
        this.level = parent.level + 1;
        this.path = parent.path
          ? `${parent.path}/${this.slug}`
          : `/${this.slug}`;
      }
    } else {
      this.level = 0;
      this.path = `/${this.slug}`;
    }
  } else if (this.isNew && !this.path) {
    this.path = `/${this.slug}`;
  }
  next();
});

const Category = mongoose.model("Category", categorySchema);
export default Category;
