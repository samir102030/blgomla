import mongoose from "mongoose";

/**
 * One fitting service on the /installations page.
 *
 * The shop sells the box and the work that puts it on the wall, and the two
 * were only ever visible together on a bundle's own page — as a checkbox at
 * the bottom of it. This gives the work a shelf of its own: what is installed,
 * what the job includes, what it starts at, and the way into the catalogue
 * that supplies it.
 *
 * The offers *on* that page are not stored here. A fitting offer is a
 * Collection with `installation.offered` set — priced, stocked, orderable —
 * and copying those into a second document would leave the page advertising a
 * price the checkout doesn't honour. The page reads them live instead.
 */

const featureSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 140 },
    textAr: { type: String, trim: true, maxlength: 140, default: "" },
  },
  { _id: false }
);

const installationServiceSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Service title is required"], trim: true, maxlength: 120 },
    titleAr: { type: String, trim: true, maxlength: 120, default: "" },
    description: { type: String, trim: true, maxlength: 600, default: "" },
    descriptionAr: { type: String, trim: true, maxlength: 600, default: "" },
    image: { type: String, trim: true, default: "" },
    icon: { type: String, trim: true, default: "wrench" },
    features: { type: [featureSchema], default: [] },
    /**
     * What the job starts at, in EGP. 0 means the price depends on the survey
     * — the page then says "priced after a site visit" rather than "0 EGP",
     * because a free-looking installation is a promise the shop can't keep.
     */
    priceFrom: { type: Number, min: 0, default: 0 },
    // A short qualifier under the price: "per camera", "up to 8 points".
    priceNote: { type: String, trim: true, maxlength: 80, default: "" },
    priceNoteAr: { type: String, trim: true, maxlength: 80, default: "" },
    // Corner ribbon: "Most requested", "New".
    badge: { type: String, trim: true, maxlength: 40, default: "" },
    badgeAr: { type: String, trim: true, maxlength: 40, default: "" },
    // Where the card's button goes — normally the filtered catalogue for the
    // gear this service fits. Built by the same link picker the hero uses.
    href: { type: String, trim: true, maxlength: 400, default: "/contact" },
    ctaLabel: { type: String, trim: true, maxlength: 60, default: "" },
    ctaLabelAr: { type: String, trim: true, maxlength: 60, default: "" },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    deleted: { type: Boolean, default: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

installationServiceSchema.index({ deleted: 1, isActive: 1, sortOrder: 1 });

const InstallationService =
  mongoose.models.InstallationService ||
  mongoose.model("InstallationService", installationServiceSchema);
export default InstallationService;
