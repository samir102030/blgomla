import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: String,
      email: String,
      role: String,
    },
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, index: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: String,
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ "actor.userId": 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
