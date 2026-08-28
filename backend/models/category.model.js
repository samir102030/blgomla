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
    // Whether this one appears in the storefront's top category menu.
    // Separate from `isActive`: a category can be perfectly live — browsable,
    // holding products, linked from a card — without needing a slot in a menu
    // that only has room for a handful. The menu used to be "top-level ones,
    // first twelve", which is why a category added under a parent could be
    // saved successfully and still never appear anywhere the customer looks.
    showInMenu: {
      type: Boolean,
      default: true,
    },
    /**
     * A slot on the department strip under the navbar.
     *
     * Separate from `showInMenu` because the two lists answer different
     * questions. The menu holds the whole catalogue and is meant to: a shopper
     * who opens it is looking for something specific. The strip is a shortlist
     * of about nine, sitting in front of everyone on every page, and it is
     * useful precisely because it is short — putting all eighteen departments
     * in it would make it another menu rather than a shortcut.
     *
     * So it defaults to off. A category earns a place on the strip by being
     * switched on for it, not by existing.
     */
    showInBar: {
      type: Boolean,
      default: false,
    },
    /**
     * Where it sits on the strip, independent of `sortOrder`.
     *
     * `sortOrder` arranges the menus and the department pages — every category
     * has one, and moving a department there moves it everywhere. The strip is
     * a dozen items out of three hundred and forty-nine, and the order that
     * reads well across a bar is not the order that reads well down a menu:
     * the shortest names want to be together, the department somebody is
     * running an offer on wants to be first. Sharing one number would mean
     * arranging the bar rearranges the shop.
     *
     * Only the ticked ones carry a meaningful value; everything else keeps 0
     * and falls back to `sortOrder`, which is what an untouched catalogue
     * looks like.
     */
    barOrder: {
      type: Number,
      default: 0,
    },
    /**
     * Marks a category as the root of a named section of the shop.
     *
     * Only the electronics branch uses it today, and it uses it so the code
     * can find that root without matching on a name an operator is free to
     * change. Unset on every ordinary category, which is why the index is
     * sparse — a unique index would otherwise treat every null as a clash.
     */
    sectionKey: {
      type: String,
      trim: true,
      lowercase: true,
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
categorySchema.index({ sectionKey: 1 }, { unique: true, sparse: true });
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
