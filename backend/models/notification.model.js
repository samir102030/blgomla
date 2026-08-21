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
    /**
     * Where this notification is about, as a path in the app.
     *
     * Every one of these announced something that exists on a page — an
     * order, an address — and then left the reader to go and find it. Not
     * every notification has somewhere to be, so it stays optional.
     *
     * A path, never a full URL: it is followed by the client router, and a
     * stored host would break the day the domain changes.
     */
    link: {
      type: String,
      trim: true,
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
    url: doc.link || "/notifications",
  }).catch(() => {});
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
