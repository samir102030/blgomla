import mongoose from "mongoose";

const advertisementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Advertisement title is required"],
      trim: true,
    },
    titleAr: {
      type: String,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    subtitleAr: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    descriptionAr: {
      type: String,
      trim: true,
    },
    backgroundColor: {
      type: String,
      trim: true,
    },
    textColor: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      required: [
        function () {
          return this.position !== "announcement";
        },
        "Advertisement image is required",
      ],
    },
    link: {
      type: String,
      trim: true,
    },
    /**
     * The artwork already has the headline written on it.
     *
     * The overlay used to be inferred — drawn whenever a subtitle happened to
     * be filled in — which put the site's own headline on top of a creative
     * that was designed with its own, so the Summer Tech Sale banner said
     * everything twice. Whether a picture carries its own text is a fact about
     * the picture, and nothing about the record can work it out; only the
     * person who uploaded it knows, so this asks them.
     */
    textInImage: {
      type: Boolean,
      default: false,
    },
    position: {
      type: String,
      enum: [
        "hero",
        "banner",
        "popup",
        "announcement",
        "category-strip",
        "sidebar",
        "pdp",
      ],
      default: "banner",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
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

// Index for efficient queries
advertisementSchema.index({ isActive: 1, deleted: 1, position: 1 });

const Advertisement = mongoose.model("Advertisement", advertisementSchema);
export default Advertisement;

