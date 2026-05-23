import mongoose from "mongoose";

// Lightweight behavioral events for merchandising/analytics. Anonymous-friendly
// (user is optional). Keep this collection append-only and cheap to write.
const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "view",
        "add_to_cart",
        "search",
        "search_no_results",
        "checkout_start",
      ],
      required: true,
    },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    query: { type: String, trim: true, maxlength: 200 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String, trim: true, maxlength: 100 },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

eventSchema.index({ type: 1, createdAt: -1 });
eventSchema.index({ type: 1, query: 1 });
eventSchema.index({ type: 1, product: 1 });

const Event = mongoose.model("Event", eventSchema);
export default Event;
