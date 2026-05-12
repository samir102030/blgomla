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
      required: [true, "Advertisement image is required"],
    },
    link: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      enum: ["hero", "banner", "popup"],
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

