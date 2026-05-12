import mongoose from "mongoose";

const pageVisitSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const visitorSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    // Parsed device info
    device: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "unknown"],
      default: "unknown",
    },
    browser: {
      type: String,
      trim: true,
    },
    os: {
      type: String,
      trim: true,
    },
    // Geo-location
    country: {
      type: String,
      trim: true,
    },
    countryCode: {
      type: String,
      trim: true,
    },
    region: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    governorate: {
      type: String,
      trim: true,
    },
    // Referrer
    referrer: {
      type: String,
      trim: true,
    },
    // Pages visited in this session
    pagesVisited: [pageVisitSchema],
    // User association (if logged in)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for analytics queries
visitorSchema.index({ createdAt: -1 });
visitorSchema.index({ device: 1 });
visitorSchema.index({ country: 1 });
visitorSchema.index({ governorate: 1 });
visitorSchema.index({ "pagesVisited.path": 1 });

const Visitor = mongoose.model("Visitor", visitorSchema);
export default Visitor;
