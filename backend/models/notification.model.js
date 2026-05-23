import mongoose from "mongoose";
import { sendPushToUser, isWebPushEnabled } from "../utils/webpush.js";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "info",
        "warning",
        "success",
        "error",
        "order",
        "promotion",
        "system",
        "product",
        "address",
        "brand_request",
        "category_request",
        "product_approval",
      ],
      default: "info",
    },
    read: {
      type: Boolean,
      default: false,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.post("save", function (doc) {
  if (!isWebPushEnabled()) return;
  sendPushToUser(doc.user, {
    title: doc.title,
    body: doc.message,
    tag: doc._id.toString(),
    url: "/notifications",
  }).catch(() => {});
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
