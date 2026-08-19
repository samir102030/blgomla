import mongoose from "mongoose";

/**
 * The student section's own departments.
 *
 * A separate collection from `Category`, not a branch of it. The two catalogues
 * describe different things — one is a wholesale electronics shop, the other is
 * what an engineering student needs for a term — and forcing them into one tree
 * would put student departments in the storefront's menu, its search, its home
 * feed and its sitemap, each of which would have to be taught to skip them.
 * Every one of those is a place a leak could happen. A collection of its own
 * cannot leak, because nothing on the storefront reads it.
 *
 * The shape mirrors `Category` where the tree logic depends on it —
 * `parentCategory`, `level`, `slug` — so the walk in `studentCategoryTree.js`
 * reads the same way as the one in `categoryTree.js` and neither is a surprise
 * to whoever meets the other first.
 */

const studentCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    nameAr: {
      type: String,
      trim: true,
      default: "",
    },
    /** Derived from the name, and only used for readable URLs. */
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: { type: String, trim: true, default: "" },
    descriptionAr: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },

    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentCategory",
      default: null,
      index: true,
    },

    /** 0 = root. Recomputed whenever the parent changes. */
    level: {
      type: Number,
      default: 0,
    },

    /** Hand-ordered within a parent; ties fall back to name. */
    order: {
      type: Number,
      default: 0,
    },

    /**
     * Hidden rather than deleted, so a department can be taken off the section
     * for a term without orphaning the products filed under it.
     */
    active: {
      type: Boolean,
      default: true,
    },

    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

studentCategorySchema.index({ parentCategory: 1, order: 1 });

/** A readable slug, kept unique by appending a counter rather than failing. */
const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

studentCategorySchema.pre("save", async function (next) {
  if (this.isModified("name") || !this.slug) {
    const base = slugify(this.name) || "category";
    let candidate = base;
    let n = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await this.constructor.exists({ slug: candidate, _id: { $ne: this._id } })) {
      n += 1;
      candidate = `${base}-${n}`;
    }
    this.slug = candidate;
  }

  if (this.isModified("parentCategory")) {
    if (this.parentCategory) {
      const parent = await this.constructor.findById(this.parentCategory).select("level");
      this.level = parent ? parent.level + 1 : 0;
    } else {
      this.level = 0;
    }
  }

  next();
});

const StudentCategory =
  mongoose.models.StudentCategory || mongoose.model("StudentCategory", studentCategorySchema);

export default StudentCategory;
