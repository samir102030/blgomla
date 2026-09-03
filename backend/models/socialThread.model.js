import mongoose from "mongoose";

/**
 * One conversation with one person on Messenger or Instagram.
 *
 * The webhook runs on Vercel, where every request may land on a cold Lambda,
 * so nothing about a thread can live in process memory: the history the model
 * needs, the message IDs already answered, and the pause after a human steps
 * in all have to survive between requests. This is that state.
 */
const socialThreadSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["messenger", "instagram"],
      required: true,
    },

    /* Page-scoped ID for Messenger, IG-scoped ID for Instagram. Either way
       it is the only handle we have on the person — Meta does not give the
       app their real profile without a review, and we do not need it. */
    psid: { type: String, required: true, trim: true },

    /* Whatever Meta will tell us, for the dashboard. Absent is normal. */
    name: { type: String, trim: true },

    /* Trimmed to the last few turns on every write. Long enough that
       "and the other one?" still makes sense, short enough that a thread
       running for months does not grow without bound. */
    history: [
      {
        _id: false,
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
        at: { type: Date, default: Date.now },
      },
    ],

    /*
      Message IDs already handled.

      Meta retries a webhook it considers undelivered, and a retry that arrives
      while the first call is still thinking looks exactly like a new message.
      Without this the customer gets the same answer twice and we pay for it
      twice. Capped at the last 20 — a retry never arrives later than that.
    */
    seenMids: [{ type: String }],

    /*
      The bot stays quiet until this time.

      Set when the customer asks for a person, and again whenever someone from
      the shop replies from the Meta inbox (that arrives as an echo). A bot
      talking over a colleague mid-conversation is worse than no bot.
    */
    pausedUntil: { type: Date },

    /* Set when a hand-off was asked for and nobody has picked it up yet.
       The ops dashboard can list these. */
    awaitingHuman: { type: Boolean, default: false },

    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

socialThreadSchema.index({ platform: 1, psid: 1 }, { unique: true });
socialThreadSchema.index({ awaitingHuman: 1, lastMessageAt: -1 });

const SocialThread = mongoose.model("SocialThread", socialThreadSchema);
export default SocialThread;
