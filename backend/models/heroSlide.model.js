import mongoose from "mongoose";

/**
 * One panel of the home-page hero carousel.
 *
 * The six slides were written into ManusHero.tsx — image path, headline and
 * the category each one opened. Changing the banner therefore meant a code
 * edit and a deploy, which put the storefront's most visible surface out of
 * reach of the people who actually run the shop. This is the same slide as a
 * document.
 *
 * `href` on a button is stored as a plain path rather than a category id plus
 * a rule for building the link: the admin's link picker resolves the category
 * to `/products?category=<id>` at the moment it is chosen, so the storefront
 * renders what it is given and one surface understands link-building instead
 * of two. A category that is later deleted leaves a link to an empty result —
 * a dead filter, not a crash.
 */

const buttonSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 60 },
    labelAr: { type: String, trim: true, maxlength: 60, default: "" },
    href: { type: String, required: true, trim: true, maxlength: 400 },
    // "primary" is the filled button, "ghost" the outlined one. Two styles
    // because the row reads as one action and one alternative; a third would
    // just be a second primary competing with the first.
    style: { type: String, enum: ["primary", "ghost"], default: "ghost" },
  },
  { _id: false }
);

const heroSlideSchema = new mongoose.Schema(
  {
    eyebrow: { type: String, trim: true, maxlength: 80, default: "" },
    eyebrowAr: { type: String, trim: true, maxlength: 80, default: "" },
    title: { type: String, required: [true, "Slide title is required"], trim: true, maxlength: 120 },
    titleAr: { type: String, trim: true, maxlength: 120, default: "" },
    // The second line, set in the brand blue.
    accent: { type: String, trim: true, maxlength: 120, default: "" },
    accentAr: { type: String, trim: true, maxlength: 120, default: "" },
    image: { type: String, required: [true, "Slide image is required"], trim: true },
    // Names a glyph in components/manus/icons.tsx. Free-form rather than an
    // enum so adding a glyph to the set doesn't need a schema change; an
    // unknown key falls back to the default glyph on the storefront.
    icon: { type: String, trim: true, default: "sparkles" },
    buttons: {
      type: [buttonSchema],
      default: [],
      validate: {
        validator: (value) => value.length <= 3,
        message: "A slide takes at most 3 buttons",
      },
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    deleted: { type: Boolean, default: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// The storefront's only query: active, not deleted, in display order.
heroSlideSchema.index({ deleted: 1, isActive: 1, sortOrder: 1 });

const HeroSlide = mongoose.models.HeroSlide || mongoose.model("HeroSlide", heroSlideSchema);
export default HeroSlide;
