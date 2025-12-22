import mongoose from "mongoose";

const returnSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "received", "refunded"],
      default: "pending",
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

const ReturnRequest = mongoose.model("ReturnRequest", returnSchema);
export default ReturnRequest;
