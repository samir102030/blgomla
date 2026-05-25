import mongoose from "mongoose";

const partyShape = {
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: String,
  email: String,
  role: String,
};

const auditLogSchema = new mongoose.Schema(
  {
    // Who performed the action.
    actor: partyShape,
    // The user the action was performed on (for account/role/status changes).
    target: partyShape,

    action: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, index: true },

    // Outcome + classification.
    status: { type: String, enum: ["success", "failure"], default: "success", index: true },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
      index: true,
    },
    // Coarse grouping used for retention: "security" | "account" | "admin" | "customer" | "system".
    category: { type: String, default: "admin", index: true },

    // Structured field-level diff for updates: [{ field, from, to }].
    changes: [
      {
        _id: false,
        field: String,
        from: mongoose.Schema.Types.Mixed,
        to: mongoose.Schema.Types.Mixed,
      },
    ],

    // Free-form extra context (reason, note, code, counts, …).
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Request fingerprint.
    method: String,
    path: String,
    ip: String,
    userAgent: String,

    // TTL: when set, the entry is auto-removed after this date. Left unset for
    // security/admin events so they are retained indefinitely.
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ "actor.userId": 1, createdAt: -1 });
auditLogSchema.index({ "target.userId": 1, createdAt: -1 });
// MongoDB TTL monitor deletes documents once expiresAt is in the past.
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
