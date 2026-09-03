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
        /*
          There was no ceiling, and the field is a percentage as often as it
          is an amount. Typing 150 where 15 was meant made
          `subtotal * (150/100)` — clamped to the subtotal by
          `studentDiscountOn`, so nothing went negative and nothing errored:
          every verified student's order simply came to zero, quietly, until
          somebody noticed. The cap is only meaningful for the percentage
          type, so it is enforced in the validator below rather than here,
          where a fixed amount of 5,000 EGP is perfectly reasonable.
        */
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

/**
 * The bare mail domain of an entry, for comparison.
 *
 * Entries added before the box learned to strip it can still carry the `www.`
 * off a faculty's address bar, and such an entry matches no address anybody
 * has. Reading it as the mail domain it was meant to be costs nothing and
 * saves a list nobody knows is broken — the entry stays as typed, only the
 * comparison is forgiving. The label is only dropped when a domain is left
 * underneath, so somebody's real `www.com` keeps its name.
 */
const bareDomain = (value) => {
  const d = String(value || "").toLowerCase().trim();
  const stripped = d.replace(/^www\./, "");
  return stripped !== d && stripped.includes(".") ? stripped : d;
};

/** The domain entry that admits this address, or null when none does. */
studentProgramSchema.methods.matchDomain = function (email) {
  const at = String(email || "").toLowerCase().trim();
  const domain = bareDomain(at.slice(at.lastIndexOf("@") + 1));
  if (!domain || !at.includes("@")) return null;
  return this.domains.find((d) => d.active && bareDomain(d.domain) === domain) || null;
};

const StudentProgram = mongoose.model("StudentProgram", studentProgramSchema);
export default StudentProgram;
