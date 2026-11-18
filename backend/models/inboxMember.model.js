import mongoose from "mongoose";

const inboxMemberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: String,
  inviteHash: { type: String, unique: true, sparse: true },
  inviteExpiresAt: Date,
}, { timestamps: true });

export default mongoose.model("InboxMember", inboxMemberSchema);
