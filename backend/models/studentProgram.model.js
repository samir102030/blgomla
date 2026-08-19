import mongoose from "mongoose";

/**
 * Settings for the university student programme — one document, edited from the
 * dashboard.
 *
 * Everything that decides who qualifies and what they get lives here rather
 * than in code, because the answer changes with every term: a new faculty
 * opens, a university moves its mail to a new domain, the discount is cut for
 * a season. None of that should need a deploy.
 *
 * The single-document shape follows the same reasoning as the site-mode
 * settings in modules/ops: there is exactly one programme, so a collection of
 * one is simpler to read and to cache than a key/value table.
 */

const domainSchema = new mongoose.Schema(
  {
    /**
     * The mail domain that proves enrolment, e.g. `eng.cu.edu.eg`.
     *
     * Stored without the `@`, lowercased, and matched on the part after the
     * last `@` of the address. A faculty-level domain is the whole mechanism
     * here: a university-wide domain cannot tell an engineering student from
     * a law student, so admitting one would admit everybody.
     */
    domain: {
      type: String,
      required: [true, "Domain is required"],
      lowercase: true,
      trim: true,
    },
    university: {
      type: String,
      trim: true,
    },
    universityAr: {
      type: String,
      trim: true,
    },
    faculty: {
      type: String,
      enum: ["engineering", "computer_science", "other"],
      default: "engineering",
    },
    /** Turned off rather than deleted, so existing members keep their history. */
    active: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true },
);

const studentProgramSchema = new mongoose.Schema(
  {
    /**
     * The whole programme, off by default. A half-configured programme that is
     * already accepting applications is worse than one that is visibly closed.
     */
    enabled: {
      type: Boolean,
      default: false,
    },

    domains: [domainSchema],

    discount: {
      type: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage",
      },
      value: {
        type: Number,
        default: 10,
        min: [0, "Discount value cannot be negative"],
      },
      /** Caps a percentage discount in currency. Ignored when unset. */
      maximumDiscount: {
        type: Number,
        min: [0, "Maximum discount cannot be negative"],
      },
      minimumPurchase: {
        type: Number,
        default: 0,
        min: [0, "Minimum purchase cannot be negative"],
      },
    },

    /**
     * The code renews rather than burning out: it is good for `usesPerPeriod`
     * orders every `periodDays`. A student buys a laptop in September and a
     * drive in March, and should not have to apply twice.
     */
    renewal: {
      usesPerPeriod: {
        type: Number,
        default: 1,
        min: [1, "A period must allow at least one use"],
      },
      periodDays: {
        type: Number,
        default: 30,
        min: [1, "A period must be at least a day"],
      },
    },

    /**
     * There is no category scope here any more.
     *
     * It used to hold roots from the public catalogue, back when the section
     * was a curated view over the shop's own products. The section now has its
     * own departments and its own products, so the scope has exactly one
     * honest value — the student shelf — and the coupon carries it as
     * `applicableAudience` rather than as a list of ids that would have to be
     * rewritten into every live code each time a department is added.
     */

    /** How long a verified membership lasts before it has to be renewed. */
    membershipDays: {
      type: Number,
      default: 365,
      min: [1, "Membership must last at least a day"],
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

/**
 * Read the settings, creating the document on first call.
 *
 * Every caller wants "the programme", not "a programme", so the lookup and the
 * first-run seed live together instead of being repeated at each call site.
 */
studentProgramSchema.statics.load = async function () {
  const existing = await this.findOne();
  if (existing) return existing;
  return this.create({});
};

/** The domain entry that admits this address, or null when none does. */
studentProgramSchema.methods.matchDomain = function (email) {
  const at = String(email || "").toLowerCase().trim();
  const domain = at.slice(at.lastIndexOf("@") + 1);
  if (!domain || !at.includes("@")) return null;
  return this.domains.find((d) => d.active && d.domain === domain) || null;
};

const StudentProgram = mongoose.model("StudentProgram", studentProgramSchema);
export default StudentProgram;
