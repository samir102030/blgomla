import mongoose from "mongoose";

const comingSoonSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    locale: { type: String, default: "en" },
    source: { type: String, default: "coming-soon" },
  },
  { timestamps: true }
);

export default mongoose.model(
  "ComingSoonSubscriber",
  comingSoonSubscriberSchema
);
