import crypto from "crypto";
import mongoose from "mongoose";

/**
 * One student's membership of the programme.
 *
 * Kept beside the user rather than inside it, for the same reason a vendor's
 * Store is: the record has its own lifecycle — applied, verified, expired,
 * suspended — and its own admin screen, and none of that belongs in a document
 * every request already loads. A user holds exactly one `role`, so student
 * status could not have been a role without stripping the customer permissions
 * the same person needs to check out.
 *
 * The university address is deliberately separate from `User.email`: students
 * lose the university mailbox when they graduate, and the account has to
 * outlive the membership.
 */

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    universityEmail: {
      type: String,
      required: [true, "University email is required"],
      lowercase: true,
      trim: true,
      unique: true,
    },
    /** Denormalised from the programme settings at application time, so the
     *  record still reads correctly after a domain is renamed or retired. */
    domain: { type: String, lowercase: true, trim: true },
    university: { type: String, trim: true },
    faculty: {
      type: String,
      enum: ["engineering", "computer_science", "other"],
      default: "engineering",
    },

    status: {
      type: String,
      enum: ["pending", "verified", "rejected", "suspended", "expired"],
      default: "pending",
      index: true,
    },
    /** Shown to the student, so it is written for them and not for the log. */
    rejectionReason: { type: String, trim: true },

    /**
     * Only the hash is stored. The plaintext goes out in the mail and is never
     * written down here, so a leaked database cannot be used to verify
     * somebody else's address.
     */
    verificationTokenHash: { type: String, select: false },
    verificationTokenExpiresAt: { type: Date },
    /** Rate-limits the resend button without a separate store. */
    verificationSentAt: { type: Date },

    verifiedAt: { type: Date },
    /** When the membership lapses and the code stops working. */
    expiresAt: { type: Date },

    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
    },

    /**
     * Renewal accounting. The coupon carries the hard usage limit; this is the
     * window that limit belongs to. When the window rolls over, the coupon's
     * count is reset — see the programme controller and the renewal cron.
     */
    periodStartedAt: { type: Date },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

studentProfileSchema.index({ createdAt: -1 });

/** True while the membership should actually buy anything. */
studentProfileSchema.virtual("isActive").get(function () {
  if (this.status !== "verified") return false;
  return !this.expiresAt || this.expiresAt > new Date();
});

/**
 * Mint a verification token: the plaintext is returned for the email, the hash
 * is what the document keeps.
 */
studentProfileSchema.methods.issueVerificationToken = function (ttlMinutes = 60) {
  const token = crypto.randomBytes(32).toString("hex");
  this.verificationTokenHash = crypto.createHash("sha256").update(token).digest("hex");
  this.verificationTokenExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  this.verificationSentAt = new Date();
  return token;
};

/** Constant-time-ish comparison of a presented token against the stored hash. */
studentProfileSchema.statics.hashToken = function (token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
};

const StudentProfile = mongoose.model("StudentProfile", studentProfileSchema);
export default StudentProfile;
