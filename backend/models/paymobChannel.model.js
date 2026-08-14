import mongoose from "mongoose";

/**
 * A Paymob payment channel.
 *
 * Paymob identifies a way to charge by an integration ID (which acquirer and
 * product — card, wallet, an instalment provider) plus an iframe ID (the
 * hosted page shown to the customer). These lived in environment variables, so
 * changing acquirer or swapping a test integration for a live one meant a
 * redeploy. Here they are rows an admin can add, switch between, and disable.
 *
 * What is deliberately NOT here: the amount and the order reference. Those are
 * derived per order at checkout and passed to Paymob with the payment key, so
 * every charge is for that customer's actual total and comes back on the
 * webhook carrying the order it belongs to. A channel selects *how* to charge,
 * never *how much*.
 */

const paymobChannelSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, "Give the channel a name you'll recognise"],
      trim: true,
    },
    // Which checkout option this channel serves. `card` is the Visa/Mastercard
    // path; `installment` backs ValU / Souhoola.
    method: {
      type: String,
      enum: ["card", "installment"],
      default: "card",
      index: true,
    },
    integrationId: {
      type: String,
      required: [true, "Integration ID is required"],
      trim: true,
    },
    iframeId: {
      type: String,
      required: [true, "Iframe ID is required"],
      trim: true,
    },
    // Optional per-channel Paymob API key, for running more than one Paymob
    // merchant account. Encrypted at rest (utils/secretBox.js) and never
    // returned by the API. Left empty, the channel uses PAYMOB_API_KEY from
    // the environment.
    //
    // Note the integration and iframe IDs above are *not* encrypted: the
    // iframe ID is visible in the URL every paying customer loads, so
    // encrypting it would protect nothing while making the row harder to
    // support. The API key is the actual secret, and it is the one covered.
    apiKeyEnc: { type: String, default: null, select: false },
    apiKeyHint: { type: String, default: null },

    isActive: { type: Boolean, default: false, index: true },
    notes: { type: String, trim: true, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Checkout asks "the active channel for this method", so index that pair.
paymobChannelSchema.index({ method: 1, isActive: 1 });

const PaymobChannel =
  mongoose.models.PaymobChannel ||
  mongoose.model("PaymobChannel", paymobChannelSchema);

export default PaymobChannel;
