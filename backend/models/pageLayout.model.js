import mongoose from "mongoose";

/**
 * The arrangement of one storefront page.
 *
 * Which sections a page shows, in which region, in what order — moved out of
 * HomePage.tsx, where it was fixed in JSX, and into a document an admin can
 * rearrange. What each section *is* stays in config/sections.js, written by
 * developers; this only records the arrangement.
 */

const sectionSchema = new mongoose.Schema(
  {
    // Matches a key in the section registry. An unknown key is skipped by the
    // storefront rather than throwing, so removing a section from the code
    // can't take the page down with it.
    key: { type: String, required: true, trim: true },
    slot: { type: String, required: true, trim: true },
    // Sparse by design — see DEFAULT_HOME_LAYOUT. A drag lands between two
    // neighbours and writes one row instead of renumbering the whole slot.
    order: { type: Number, required: true },
    enabled: { type: Boolean, default: true },
    // Per-section overrides (titles, limits). Free-form because each section
    // type declares its own shape in the registry.
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const pageLayoutSchema = new mongoose.Schema(
  {
    page: { type: String, required: true, trim: true },
    sections: { type: [sectionSchema], default: [] },
    // Bumped on every save. A client that loaded version 6, then saves while
    // someone else already wrote 7, is rejected rather than silently
    // overwriting the other person's arrangement.
    version: { type: Number, default: 1 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

pageLayoutSchema.index({ page: 1 }, { unique: true });

const PageLayout =
  mongoose.models.PageLayout || mongoose.model("PageLayout", pageLayoutSchema);

export default PageLayout;
