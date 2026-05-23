import mongoose from "mongoose";

// Records lifecycle emails we've already sent, so crons stay idempotent without
// having to add flags onto other models.
const emailLogSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String, required: true },
  },
  { timestamps: true }
);

emailLogSchema.index({ order: 1, type: 1 }, { unique: true });

const EmailLog = mongoose.model("EmailLog", emailLogSchema);
export default EmailLog;
