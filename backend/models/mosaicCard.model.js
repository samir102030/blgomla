import mongoose from "mongoose";

// A tile inside a "quadrant" card (Amazon-style 4-up sub-category grid).
const tileSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    labelAr: { type: String, trim: true },
    image: { type: String, trim: true },
    link: { type: String, trim: true },
  },
  { _id: false }
);

const mosaicCardSchema = new mongoose.Schema(
  {
    // `title` is auto-localized by translation.middleware (swaps in titleAr on ?lang=ar).
    title: {
      type: String,
      required: [true, "Mosaic card title is required"],
      trim: true,
    },
    titleAr: {
      type: String,
      trim: true,
      default: "",
    },
    // "single": one big lifestyle image. "quadrant": 2x2 tiles + a "see more" link.
    type: {
      type: String,
      enum: ["single", "quadrant"],
      default: "single",
    },
    // Required for single cards (the big image). Optional for quadrant.
    image: {
      type: String,
      required: [
        function () {
          return this.type === "single";
        },
        "Image is required for a single-image card",
      ],
    },
    // Single-card click target, and the quadrant "see more" link.
    link: {
      type: String,
      trim: true,
    },
    tiles: {
      type: [tileSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

mosaicCardSchema.index({ isActive: 1, deleted: 1, sortOrder: 1 });

const MosaicCard = mongoose.model("MosaicCard", mosaicCardSchema);
export default MosaicCard;
