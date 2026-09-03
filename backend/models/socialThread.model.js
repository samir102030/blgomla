import mongoose from "mongoose";

/**
 * One conversation with one person on one social channel.
 *
 * The website assistant keeps its history in the browser tab and loses it when
 * the tab closes. A customer on WhatsApp does not think that way: they ask a
 * question on Tuesday, come back Thursday and carry on the same sentence. So
 * the thread is the record — it is what makes the reply on Thursday know what
 * was said on Tuesday, and it is what a human picks up when the bot hands over.
 *
 * Keyed by (channel, externalId) because the same person reaching us on
 * WhatsApp and on Instagram is, to every API involved, two different people
 * with two unrelated ids. Merging them is a later problem and needs their
 * consent; pretending they are the same now would leak one person's order
 * history into another person's chat.
 */

const turnSchema = new mongoose.Schema(
  {
    // "agent" is a human on our side, so a later read can tell the model's
    // words from a colleague's without guessing.
    role: { type: String, enum: ["user", "assistant", "agent"], required: true },
    content: { type: String, required: true, maxlength: 4000 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const socialThreadSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["whatsapp", "instagram", "messenger", "tiktok"],
      required: true,
      index: true,
    },

    /** WhatsApp wa_id, Instagram-scoped id, Messenger PSID, TikTok user id. */
    externalId: { type: String, required: true, trim: true },

    /**
     * Which of our own numbers/pages this arrived on. One Meta app can serve
     * several, and the reply has to go back out of the same door it came in.
     */
    accountId: { type: String, trim: true, default: "" },

    displayName: { type: String, trim: true, default: "" },
    /** Only ever what the platform handed us, or what the customer typed. */
    phone: { type: String, trim: true, default: "" },

    /**
     * Set only when the customer proves the account is theirs. Until then the
     * order tools see `null` and refuse — a phone number matching a row in the
     * users collection is not proof, it is a coincidence waiting to happen.
     */
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    history: { type: [turnSchema], default: [] },

    lastInboundAt: { type: Date },
    lastOutboundAt: { type: Date },

    /**
     * Message ids we have already answered.
     *
     * Meta redelivers a webhook it did not get a 200 for, and it does not
     * care that we were still thinking. Without this the customer gets the
     * same answer three times and we pay for it three times.
     */
    seenMessageIds: { type: [String], default: [] },

    /**
     * bot   — the assistant answers.
     * human — a person on the team owns it; the assistant stays quiet.
     * closed— resolved; the next inbound message reopens it as `bot`.
     */
    status: {
      type: String,
      enum: ["bot", "human", "closed"],
      default: "bot",
      index: true,
    },
    handoffReason: { type: String, trim: true, default: "" },
    handoffAt: { type: Date },

    lang: { type: String, enum: ["ar", "en"], default: "ar" },

    /** Message count, kept for the dashboard so it never has to $size a doc. */
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

socialThreadSchema.index({ channel: 1, externalId: 1 }, { unique: true });
socialThreadSchema.index({ status: 1, updatedAt: -1 });

/**
 * A thread that has run for months is not more useful for having every turn
 * in it — the model only ever reads the tail, and the document has a 16 MB
 * ceiling it would eventually meet. Keep the last 40 turns and the count.
 */
const HISTORY_LIMIT = 40;
const SEEN_LIMIT = 50;

socialThreadSchema.pre("save", function (next) {
  if (this.history.length > HISTORY_LIMIT) {
    this.history = this.history.slice(-HISTORY_LIMIT);
  }
  if (this.seenMessageIds.length > SEEN_LIMIT) {
    this.seenMessageIds = this.seenMessageIds.slice(-SEEN_LIMIT);
  }
  next();
});

/** The shape `supportBrain.answer()` wants for its `history` argument. */
socialThreadSchema.methods.brainHistory = function (limit = 10) {
  return this.history
    .slice(-limit)
    .map((turn) => ({
      role: turn.role === "user" ? "user" : "assistant",
      content: turn.content,
    }));
};

const SocialThread = mongoose.model("SocialThread", socialThreadSchema);
export default SocialThread;
