import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, "Image URL is required"],
      unique: [true, "Image URL must be unique"],
    },
    public_id: {
      type: String,
      required: [true, "Public ID is required"],
      unique: [true, "Public ID must be unique"],
    },
    alt: {
      type: String,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Image = mongoose.model("Image", imageSchema);
export default Image;
